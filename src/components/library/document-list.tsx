import { Button } from "@/components/ui/button";
import { deleteDocument, indexDocumentAction } from "@/src/lib/documents/actions";
import type { LibraryDocument } from "@/src/lib/documents/queries";
import { IndexButton } from "./index-button";

function kindLabel(mimeType: string) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "text/markdown") return "Markdown";
  return "Text";
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const statusLabel: Record<LibraryDocument["status"], string> = {
  pending: "Waiting to be indexed",
  queued: "Queued for indexing…",
  processing: "Indexing…",
  ready: "Ready",
  failed: "Indexing failed",
};

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export function DocumentList({ documents }: { documents: LibraryDocument[] }) {
  if (documents.length === 0) {
    return (
      <p className="text-muted-foreground">
        No documents yet. Add a PDF, text or Markdown file above and it will
        appear here.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border border-y border-border">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-start justify-between gap-4 py-4">
          <div className="min-w-0">
            <p className="truncate font-medium">{doc.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {kindLabel(doc.mimeType)} · {doc.pageCount}{" "}
              {doc.pageCount === 1 ? "page" : "pages"} ·{" "}
              {formatSize(doc.byteSize)} · Added{" "}
              {dateFormat.format(doc.createdAt)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {doc.status === "ready"
                ? `Ready · ${doc.chunkCount} passages`
                : statusLabel[doc.status]}
            </p>
              {(doc.status === "failed" || doc.status === "pending") &&
              doc.errorMessage && (
                <p className="mt-1 text-sm text-destructive">{doc.errorMessage}</p>
              )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {(doc.status === "pending" || doc.status === "failed") && (
              <form action={indexDocumentAction.bind(null, doc.id)}>
                <IndexButton
                  label={doc.status === "failed" ? "Try again" : "Index now"}
                />
              </form>
            )}
            <form action={deleteDocument.bind(null, doc.id)}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                aria-label={`Delete ${doc.title}`}
              >
                Delete
              </Button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}