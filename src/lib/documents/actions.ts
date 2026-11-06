"use server";

import { and, eq, inArray, } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/src/db";
import { documents } from "@/src/db/schema";
import { requireUser } from "@/src/lib/auth/current-user";
import { enqueueIndexing } from "@/src/lib/documents/enqueue";

import { enforceLimits } from "@/src/lib/rate-limit/limit";
import { UPLOAD_RULES } from "@/src/lib/rate-limit/rules";

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

  const limited = await enforceLimits(user.id, UPLOAD_RULES);
  if (!limited.allowed) {
    // Show the reason next to the document
    await db
      .update(documents)
      .set({ errorMessage: limited.message })
      .where(
        and(
          eq(documents.id, parsedId.data),
          eq(documents.ownerId, user.id),
          inArray(documents.status, ["pending", "failed"]),
        ),
      );
    revalidatePath("/library");
    return;
  }

  await enqueueIndexing(parsedId.data, user.id);
  revalidatePath("/library");
}