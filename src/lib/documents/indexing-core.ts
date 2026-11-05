import { createHash } from "node:crypto";
import { APICallError } from "ai";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { FatalError, RetryableError } from "workflow";
import { db } from "../../db";
import { chunks, documentPages, documents } from "../../db/schema";
import { EMBEDDING_MODEL_ID, embedDocuments } from "../ai/embeddings";
import { EMBEDDING_DIMENSIONS, MAX_CHUNKS_PER_DOCUMENT } from "../constants";
import { chunkPages } from "./chunking";

// The only messages that may be shown to users
export const INDEX_MESSAGES = {
  noText: "This document has no text to index.",
  tooLong: `This document is too long to index on the free tier (limit: ${MAX_CHUNKS_PER_DOCUMENT} passages).`,
  gone: "This document was removed before indexing finished.",
  busy: "The AI service is busy or the free quota is used up. Try again in a few minutes.",
  generic: "Indexing failed. Try again in a few minutes.",
} as const;

const SAFE_MESSAGES = new Set<string>(Object.values(INDEX_MESSAGES));

// Anything not on the list is replaced, so internal errors never reach the UI
export function safeFailureMessage(message: string) {
  return SAFE_MESSAGES.has(message) ? message : INDEX_MESSAGES.generic;
}

// A problem with a user-safe message that retrying can't fix
class IndexError extends Error {}

// Turns any error into one the workflow runtime should treat correctly
export function toWorkflowError(error: unknown): Error {
  if (error instanceof FatalError || error instanceof RetryableError) {
    return error;
  }
  if (error instanceof IndexError) return new FatalError(error.message);
  if (APICallError.isInstance(error) && error.statusCode === 429) {
    return new RetryableError(INDEX_MESSAGES.busy, { retryAfter: "1m" });
  }
  console.error("Indexing step failed", error);
  return new Error(INDEX_MESSAGES.generic); // plain errors are retried
}

const hashText = (text: string) =>
  createHash("sha256").update(text).digest("hex");

// Chunking is deterministic, so every step can rebuild the same list
async function loadPieces(documentId: string, ownerId: string) {
  const pages = await db
    .select({
      pageNumber: documentPages.pageNumber,
      content: documentPages.content,
    })
    .from(documentPages)
    .where(
      and(
        eq(documentPages.documentId, documentId),
        eq(documentPages.ownerId, ownerId),
      ),
    )
    .orderBy(asc(documentPages.pageNumber));

  return chunkPages(pages).map((piece) => ({
    ...piece,
    hash: hashText(piece.content),
  }));
}

// Step 1: start processing, validate, and clear any old passages
export async function planIndexing(documentId: string, ownerId: string) {
  const [claimed] = await db
    .update(documents)
    .set({ status: "processing", errorMessage: null, updatedAt: new Date() })
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.ownerId, ownerId),
        inArray(documents.status, ["queued", "processing"]),
      ),
    )
    .returning({ id: documents.id });
  if (!claimed) throw new IndexError(INDEX_MESSAGES.gone);

  const pieces = await loadPieces(documentId, ownerId);
  if (pieces.length === 0) throw new IndexError(INDEX_MESSAGES.noText);
  if (pieces.length > MAX_CHUNKS_PER_DOCUMENT) {
    throw new IndexError(INDEX_MESSAGES.tooLong);
  }

  // Fresh start, so a re-index never leaves stale passages behind
  await db
    .delete(chunks)
    .where(and(eq(chunks.documentId, documentId), eq(chunks.ownerId, ownerId)));

  return { total: pieces.length };
}

// Step 2 (repeated): embed one slice of passages and store it.
// Safe to run twice: rows that already exist are skipped.
export async function embedAndStoreBatch(
  documentId: string,
  ownerId: string,
  from: number,
  to: number,
) {
  const [doc] = await db
    .select({ mimeType: documents.mimeType })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.ownerId, ownerId)));
  if (!doc) throw new IndexError(INDEX_MESSAGES.gone);

  const slice = (await loadPieces(documentId, ownerId)).slice(from, to);
  if (slice.length !== to - from) throw new IndexError(INDEX_MESSAGES.gone);

  // Reuse vectors for text this user has already embedded
  const uniqueHashes = [...new Set(slice.map((piece) => piece.hash))];
  const known = await db
    .select({ hash: chunks.contentHash, embedding: chunks.embedding })
    .from(chunks)
    .where(
      and(
        eq(chunks.ownerId, ownerId),
        eq(chunks.embeddingModel, EMBEDDING_MODEL_ID),
        inArray(chunks.contentHash, uniqueHashes),
      ),
    );
  const vectorByHash = new Map<string, number[]>();
  for (const row of known) vectorByHash.set(row.hash, row.embedding);

  const textByHash = new Map(slice.map((piece) => [piece.hash, piece.content]));
  const missing = uniqueHashes.filter((hash) => !vectorByHash.has(hash));
  const fresh = await embedDocuments(
    missing.map((hash) => textByHash.get(hash)!),
  );
  missing.forEach((hash, i) => {
    if (fresh[i].length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Unexpected embedding size: ${fresh[i].length}`);
    }
    vectorByHash.set(hash, fresh[i]);
  });

  console.info(
    `Indexed passages ${from}-${to - 1} of ${documentId}: ${missing.length} embedded, ${uniqueHashes.length - missing.length} reused`,
  );

  const isPdf = doc.mimeType === "application/pdf";
  await db
    .insert(chunks)
    .values(
      slice.map((piece, offset) => ({
        documentId,
        ownerId,
        chunkIndex: from + offset,
        pageNumber: isPdf ? piece.pageNumber : null,
        content: piece.content,
        contentHash: piece.hash,
        embedding: vectorByHash.get(piece.hash)!,
        embeddingModel: EMBEDDING_MODEL_ID,
      })),
    )
    .onConflictDoNothing(); // idempotent: a retried step can't create duplicates

  // Heartbeat: shows the document is still being worked on
  await db
    .update(documents)
    .set({ updatedAt: new Date() })
    .where(and(eq(documents.id, documentId), eq(documents.ownerId, ownerId)));
}

// Step 3: check everything arrived, then publish the document
export async function finishIndexing(
  documentId: string,
  ownerId: string,
  total: number,
) {
  const [{ stored }] = await db
    .select({ stored: count() })
    .from(chunks)
    .where(and(eq(chunks.documentId, documentId), eq(chunks.ownerId, ownerId)));
  if (stored !== total) throw new IndexError(INDEX_MESSAGES.generic);

  await db
    .update(documents)
    .set({ status: "ready", errorMessage: null, updatedAt: new Date() })
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.ownerId, ownerId),
        eq(documents.status, "processing"),
      ),
    );
}

// Final step when anything above gives up
export async function markFailed(
  documentId: string,
  ownerId: string,
  message: string,
) {
  await db
    .update(documents)
    .set({
      status: "failed",
      errorMessage: safeFailureMessage(message),
      updatedAt: new Date(),
    })
    .where(and(eq(documents.id, documentId), eq(documents.ownerId, ownerId)));
}