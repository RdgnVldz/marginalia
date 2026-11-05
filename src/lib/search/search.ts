import "server-only";
import { APICallError } from "ai";
import { and, asc, cosineDistance, eq, sql } from "drizzle-orm";
import { db } from "@/src/db";
import { chunks, documents } from "@/src/db/schema";
import { embedQuery } from "@/src/lib/ai/embeddings";
import { MIN_SIMILARITY, SEARCH_TOP_K } from "@/src/lib/constants";

export type SearchResult = {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  pageNumber: number | null;
  content: string;
  similarity: number;
};

export type SearchOutcome =
  | { ok: true; results: SearchResult[] }
  | { ok: false; message: string };

function describeSearchError(error: unknown): string {
  if (APICallError.isInstance(error) && error.statusCode === 429) {
    return "The AI service is busy or the free quota is used up. Try again in a few minutes.";
  }
  return "Search failed. Try again in a moment.";
}

// ownerId is required: every search is scoped to one user, no exceptions.
export async function searchPassages(
  ownerId: string,
  question: string,
): Promise<SearchOutcome> {
  let queryVector: number[];
  try {
    queryVector = await embedQuery(question);
  } catch (error) {
    console.error("Query embedding failed", error);
    return { ok: false, message: describeSearchError(error) };
  }

  // cosine distance: 0 = same direction, larger = less similar
  const distance = cosineDistance(chunks.embedding, queryVector);

  const rows = await db.transaction(async (tx) => {
    // Keep scanning the HNSW index until enough rows pass the owner filter.
    // SET LOCAL lasts only for this transaction.
    await tx.execute(sql`SET LOCAL hnsw.iterative_scan = strict_order`);

    return tx
      .select({
        chunkId: chunks.id,
        documentId: documents.id,
        documentTitle: documents.title,
        pageNumber: chunks.pageNumber,
        content: chunks.content,
        distance: sql<number>`${distance}`,
      })
      .from(chunks)
      .innerJoin(documents, eq(documents.id, chunks.documentId))
      .where(and(eq(chunks.ownerId, ownerId), eq(documents.ownerId, ownerId)))
      .orderBy(asc(distance)) // must be ORDER BY distance ASC for the index to apply
      .limit(SEARCH_TOP_K);
  });

  const results = rows
    .map((row) => ({
      chunkId: row.chunkId,
      documentId: row.documentId,
      documentTitle: row.documentTitle,
      pageNumber: row.pageNumber,
      content: row.content,
      similarity: 1 - Number(row.distance),
    }))
    .filter((result) => result.similarity >= MIN_SIMILARITY);

  return { ok: true, results };
}