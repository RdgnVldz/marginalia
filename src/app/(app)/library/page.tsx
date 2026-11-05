import type { Metadata } from "next";
import { Suspense } from "react";
import { DocumentList } from "@/src/components/library/document-list";
import { UploadForm } from "@/src/components/library/upload-form";
import { requireUser } from "@/src/lib/auth/current-user";
import { listDocuments } from "@/src/lib/documents/queries";

export const metadata: Metadata = { title: "Library" };

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-serif text-3xl font-medium tracking-tight">
        Library
      </h1>
      <p className="mt-3 text-muted-foreground">
        Add documents to ask questions about them. Everything here is private
        to your account.
      </p>

      <div className="mt-8">
        <UploadForm />
      </div>

      <div className="mt-10">
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">
              Loading your documents…
            </p>
          }
        >
          <Documents />
        </Suspense>
      </div>
    </div>
  );
}

async function Documents() {
  const user = await requireUser();
  const documents = await listDocuments(user.id);
  return <DocumentList documents={documents} />;
}