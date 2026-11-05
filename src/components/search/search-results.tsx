import type { SearchResult } from "@/src/lib/search/search";

export function SearchResults({ results }: { results: SearchResult[] }) {
  return (
    <ol className="mt-10 space-y-8">
      {results.map((result) => (
        <li key={result.chunkId} className="border-l-4 border-highlight pl-4">
          <p className="whitespace-pre-line font-serif text-lg leading-relaxed">
            {result.content}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {result.documentTitle}
            {result.pageNumber ? ` · page ${result.pageNumber}` : ""} · match{" "}
            {Math.round(result.similarity * 100)}%
          </p>
        </li>
      ))}
    </ol>
  );
}