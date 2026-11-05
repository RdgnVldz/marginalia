import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { SearchForm } from "@/src/components/search/search-form";
import { SearchResults } from "@/src/components/search/search-results";
import { requireUser } from "@/src/lib/auth/current-user";
import { MAX_QUERY_CHARS, MIN_QUERY_CHARS } from "@/src/lib/constants";
import { countSearchablePassages } from "@/src/lib/documents/queries";
import { searchPassages } from "@/src/lib/search/search";

export const metadata: Metadata = { title: "Search" };

const querySchema = z
  .string()
  .trim()
  .min(MIN_QUERY_CHARS, `Enter at least ${MIN_QUERY_CHARS} characters.`)
  .max(MAX_QUERY_CHARS, `Keep it under ${MAX_QUERY_CHARS} characters.`);

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-serif text-3xl font-medium tracking-tight">Search</h1>
      <p className="mt-3 text-muted-foreground">
        Find the passages in your documents that best match a question or a
        topic. Results come only from your own library.
      </p>
      <Suspense fallback={<SearchForm />}>
        <SearchContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SearchContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;
  const raw = Array.isArray(q) ? q[0] : q;

  // Nothing to search yet? Say so instead of returning an empty list.
  if ((await countSearchablePassages(user.id)) === 0) {
    return (
      <>
        <SearchForm defaultValue={raw ?? ""} />
        <p className="mt-8 text-muted-foreground">
          Nothing is searchable yet. Add a document in your{" "}
          <Link href="/library" className="text-foreground underline underline-offset-4">
            Library
          </Link>{" "}
          and wait until it says Ready.
        </p>
      </>
    );
  }

  if (!raw) return <SearchForm />;

  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return (
      <>
        <SearchForm defaultValue={raw} />
        <p role="alert" className="mt-4 text-sm text-destructive">
          {parsed.error.issues[0]?.message}
        </p>
      </>
    );
  }

  const outcome = await searchPassages(user.id, parsed.data);

  if (!outcome.ok) {
    return (
      <>
        <SearchForm defaultValue={parsed.data} />
        <p role="alert" className="mt-4 text-sm text-destructive">
          {outcome.message}
        </p>
      </>
    );
  }

  return (
    <>
      <SearchForm defaultValue={parsed.data} />
      {outcome.results.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          No passages matched closely enough. Try different words, or describe
          the topic in a sentence.
        </p>
      ) : (
        <SearchResults results={outcome.results} />
      )}
    </>
  );
}