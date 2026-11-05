"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/src/db";
import { documents } from "@/src/db/schema";
import { requireUser } from "@/src/lib/auth/current-user";
import { indexDocument } from "@/src/lib/documents/indexing";

const idSchema = z.string().uuid();

export async function deleteDocument(documentId: string) {
  const user = await requireUser(); // every action checks for itself

  const parsedId = idSchema.safeParse(documentId);
  if (!parsedId.success) return;

  // Both conditions matter: the id AND the owner. Pages and chunks are
  // removed automatically by ON DELETE CASCADE.
  await db
    .delete(documents)
    .where(
      and(eq(documents.id, parsedId.data), eq(documents.ownerId, user.id)),
    );

  revalidatePath("/library");
}

// Used for "Index now" (documents uploaded before indexing existed) and "Try again"
export async function indexDocumentAction(documentId: string) {
  const user = await requireUser();

  const parsedId = idSchema.safeParse(documentId);
  if (!parsedId.success) return;

  await indexDocument(parsedId.data, user.id);
  revalidatePath("/library");
}