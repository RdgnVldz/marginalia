import { and, count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/src/db";
import { documentPages, documents } from "@/src/db/schema";
import { getCurrentUser } from "@/src/lib/auth/current-user";
import { MAX_DOCUMENTS_PER_USER, MAX_FILE_BYTES } from "@/src/lib/constants";
import { ParseError, parseDocument } from "@/src/lib/documents/parse";
import { enqueueIndexing } from "@/src/lib/documents/enqueue";

import { enforceLimits, tooManyRequests } from "@/src/lib/rate-limit/limit";
import { UPLOAD_RULES } from "@/src/lib/rate-limit/rules";

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  // Route handlers don't get the automatic origin check Server Actions have,
  // so refuse requests that come from another site.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return fail("Forbidden.", 403);
  }

  const user = await getCurrentUser();
  if (!user) return fail("Sign in to upload documents.", 401);

  const limited = await enforceLimits(user.id, UPLOAD_RULES);
  if (!limited.allowed) return tooManyRequests(limited);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return fail("The upload couldn't be read. Try again.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return fail("Choose a file to upload.", 400);
  }
  if (file.size > MAX_FILE_BYTES) {
    return fail(
      `That file is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB.`,
      413,
    );
  }

  // Count only this user's documents
  const [{ total }] = await db
    .select({ total: count() })
    .from(documents)
    .where(eq(documents.ownerId, user.id));
  if (total >= MAX_DOCUMENTS_PER_USER) {
    return fail(
      `You can keep up to ${MAX_DOCUMENTS_PER_USER} documents. Delete one to add another.`,
      409,
    );
  }

  let parsed;
  try {
    parsed = await parseDocument(
      file.name,
      new Uint8Array(await file.arrayBuffer()),
    );
  } catch (error) {
    if (error instanceof ParseError) return fail(error.message, 422);
    console.error("Unexpected parse error", error);
    return fail("Something went wrong while reading this file.", 500);
  }

  const filename = file.name.slice(0, 200);
  const title = filename.replace(/\.[^.]+$/, "").slice(0, 120) || "Untitled";
  const charCount = parsed.pages.reduce((sum, p) => sum + p.content.length, 0);

  // One transaction: either the document and all its pages exist, or nothing does
  const documentId = await db.transaction(async (tx) => {
    const [document] = await tx
      .insert(documents)
      .values({
        ownerId: user.id,
        title,
        filename,
        mimeType: parsed.mimeType, // decided by the server, not the browser
        byteSize: file.size,
        pageCount: parsed.pageCount,
        charCount,
      })
      .returning({ id: documents.id });

    await tx.insert(documentPages).values(
      parsed.pages.map((page) => ({
        documentId: document.id,
        ownerId: user.id,
        pageNumber: page.pageNumber,
        content: page.content,
      })),
    );

    return document.id;
  });

  // Indexing continues in the background; the Library page shows progress.
  const started = await enqueueIndexing(documentId, user.id);

  return NextResponse.json(
    {
      id: documentId,
      status: started ? "queued" : "failed",
      error: started
        ? null
        : "indexing couldn't start. Use Try again in the list below.",
    },
    { status: 201 },
  );

}