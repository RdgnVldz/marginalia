import "server-only";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/src/db";
import { chunks, documents } from "@/src/db/schema";

// Always takes the owner's id. Never write a query that returns other users' rows.
export async function listDocuments(ownerId: string) {
  return db
    .select({
      id: documents.id,
      title: documents.title,
      mimeType: documents.mimeType,
      byteSize: documents.byteSize,
      pageCount: documents.pageCount,
      status: documents.status,
      errorMessage: documents.errorMessage,
      createdAt: documents.createdAt,
      chunkCount: count(chunks.id),
    })
    .from(documents)
    .leftJoin(chunks, eq(chunks.documentId, documents.id))
    .where(eq(documents.ownerId, ownerId))
    .groupBy(documents.id)
    .orderBy(desc(documents.createdAt));
}

export type LibraryDocument = Awaited<ReturnType<typeof listDocuments>>[number];

export async function countSearchablePassages(ownerId: string) {
  const [{ total }] = await db
    .select({ total: count() })
    .from(chunks)
    .innerJoin(documents, eq(documents.id, chunks.documentId))
    .where(and(eq(chunks.ownerId, ownerId), eq(documents.status, "ready")));
  return total;
}