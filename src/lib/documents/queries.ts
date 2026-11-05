import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/src/db";
import { documents } from "@/src/db/schema";

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
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(eq(documents.ownerId, ownerId))
    .orderBy(desc(documents.createdAt));
}

export type LibraryDocument = Awaited<ReturnType<typeof listDocuments>>[number];