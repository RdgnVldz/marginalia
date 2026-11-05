import "server-only";
import { createHash } from "node:crypto";
import { APICallError } from "ai";
import { and, asc, eq, inArray, lt, or } from "drizzle-orm";
import { db } from "@/src/db";
import { chunks, documentPages, documents } from "@/src/db/schema";
import { EMBEDDING_MODEL_ID, embedDocuments } from "@/src/lib/ai/embeddings";
import { EMBEDDING_DIMENSIONS, MAX_CHUNKS_PER_DOCUMENT } from "@/src/lib/constants";
import { chunkPages } from "./chunking";

// Errors whose message is safe to show to the user
class IndexError extends Error {}

const STALE_PROCESSING_MS = 10 * 60 * 1000;

const hashText = (text: string) =>
  createHash("sha256").update(text).digest("hex");

function describeFailure(error: unknown): string {
  if (error instanceof IndexError) return error.message;
  if (APICallError.isInstance(error) && error.statusCode === 429) {
    return "The AI service is busy or the free quota is used up. Try again in a few minutes.";
  }
  return "Indexing failed. Try again in a few minutes.";
}

export async function indexDocument(documentId: string, ownerId: string) {
  // Claim the document. This single UPDATE is atomic, so two requests can't
  // index the same document at once. A document stuck in "processing" for
  // more than 10 minutes (a crashed request) can be claimed again.
  const [claimed] = await db
    .update(documents)
    .set({ status: "processing", errorMessage: null, updatedAt: new Date() })
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.ownerId, ownerId),
        or(
          inArray(documents.status, ["pending", "failed"]),
          and(
            eq(documents.status, "processing"),
            lt(documents.updatedAt, new Date(Date.now() - STALE_PROCESSING_MS)),
          ),
        ),
      ),
    )
    .returning({ id: documents.id, mimeType: documents.mimeType });

  if (!claimed) return; // not found, not yours, or already being handled

  try {
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

    const pieces = chunkPages(pages).map((piece) => ({
      ...piece,
      hash: hashText(piece.content),
    }));

    if (pieces.length === 0) throw new IndexError("This document has no text to index.");
    if (pieces.length > MAX_CHUNKS_PER_DOCUMENT) {
      throw new IndexError(
        `This document is too long to index on the free tier (limit: ${MAX_CHUNKS_PER_DOCUMENT} passages).`,
      );
    }

    // Reuse vectors for text we've already embedded for this user
    const uniqueHashes = [...new Set(pieces.map((p) => p.hash))];
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

    // Embed only what's new
    const textByHash = new Map(pieces.map((p) => [p.hash, p.content]));
    const missing = uniqueHashes.filter((hash) => !vectorByHash.has(hash));
    const fresh = await embedDocuments(missing.map((hash) => textByHash.get(hash)!));
    missing.forEach((hash, i) => {
      if (fresh[i].length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Unexpected embedding size: ${fresh[i].length}`);
      }
      vectorByHash.set(hash, fresh[i]);
    });

    console.info(
      `Indexed ${documentId}: ${pieces.length} passages, ${missing.length} embedded, ${uniqueHashes.length - missing.length} reused`,
    );

    const isPdf = claimed.mimeType === "application/pdf";
    const rows = pieces.map((piece, index) => ({
      documentId,
      ownerId,
      chunkIndex: index,
      pageNumber: isPdf ? piece.pageNumber : null, // text files have no real pages
      content: piece.content,
      contentHash: piece.hash,
      embedding: vectorByHash.get(piece.hash)!,
      embeddingModel: EMBEDDING_MODEL_ID,
    }));

    // All or nothing: old chunks out, new ones in, status updated together
    await db.transaction(async (tx) => {
      await tx
        .delete(chunks)
        .where(and(eq(chunks.documentId, documentId), eq(chunks.ownerId, ownerId)));
      for (let i = 0; i < rows.length; i += 100) {
        await tx.insert(chunks).values(rows.slice(i, i + 100));
      }
      await tx
        .update(documents)
        .set({ status: "ready", updatedAt: new Date() })
        .where(and(eq(documents.id, documentId), eq(documents.ownerId, ownerId)));
    });
  } catch (error) {
    console.error("Indexing failed", error);
    await db
      .update(documents)
      .set({
        status: "failed",
        errorMessage: describeFailure(error),
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, documentId), eq(documents.ownerId, ownerId)));
  }
}