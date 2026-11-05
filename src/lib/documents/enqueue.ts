import "server-only";
import { and, eq, inArray, lt, or } from "drizzle-orm";
import { start } from "workflow/api";
import { db } from "@/src/db";
import { documents } from "@/src/db/schema";
import { indexDocumentWorkflow } from "@/src/workflows/index-document";

// A document stuck in queued/processing this long is treated as abandoned
const STUCK_AFTER_MS = 15 * 60 * 1000;

// Returns true if a workflow was started. The status change is one atomic
// UPDATE, so two clicks or two requests can't start two workflows.
export async function enqueueIndexing(documentId: string, ownerId: string) {
  const stuckBefore = new Date(Date.now() - STUCK_AFTER_MS);

  const [moved] = await db
    .update(documents)
    .set({ status: "queued", errorMessage: null, updatedAt: new Date() })
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.ownerId, ownerId),
        or(
          inArray(documents.status, ["pending", "failed"]),
          and(
            inArray(documents.status, ["queued", "processing"]),
            lt(documents.updatedAt, stuckBefore),
          ),
        ),
      ),
    )
    .returning({ id: documents.id });

  if (!moved) return false; // already running, ready, or not yours

  try {
    // Pass only ids, never document text
    await start(indexDocumentWorkflow, [documentId, ownerId]);
    return true;
  } catch (error) {
    console.error("Could not start the indexing workflow", error);
    await db
      .update(documents)
      .set({
        status: "failed",
        errorMessage: "Indexing couldn't start. Use Try again.",
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, documentId), eq(documents.ownerId, ownerId)));
    return false;
  }
}