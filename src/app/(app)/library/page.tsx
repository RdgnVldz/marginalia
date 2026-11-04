import type { Metadata } from "next";

export const metadata: Metadata = { title: "Library" };

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-serif text-3xl font-medium tracking-tight">
        Library
      </h1>
      <p className="mt-3 text-muted-foreground">
        No documents yet. Documents you add will appear here, ready to be
        searched.
      </p>
    </div>
  );
}