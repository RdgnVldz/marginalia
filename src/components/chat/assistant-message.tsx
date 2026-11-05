"use client";

import { useState } from "react";
import type { ChatSource } from "@/src/lib/chat/types";

type Props = { messageId: string; text: string; sources: ChatSource[] };

// Source numbers the answer actually cites, in order of first appearance
function citedNumbers(text: string, sources: ChatSource[]) {
  const valid = new Set(sources.map((source) => source.n));
  const seen: number[] = [];
  for (const match of text.matchAll(/\[(\d{1,2})\]/g)) {
    const n = Number(match[1]);
    if (valid.has(n) && !seen.includes(n)) seen.push(n);
  }
  return seen;
}

export function AssistantMessage({ messageId, text, sources }: Props) {
  // Which citation is hovered, focused or tapped
  const [active, setActive] = useState<number | null>(null);

  const valid = new Set(sources.map((source) => source.n));
  const notes = citedNumbers(text, sources).map(
    (n) => sources.find((source) => source.n === n)!,
  );

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
      <p className="max-w-prose whitespace-pre-wrap font-serif text-lg leading-relaxed">
        {text.split(/(\[\d{1,2}\])/).map((part, index) => {
          const match = part.match(/^\[(\d{1,2})\]$/);
          const n = match ? Number(match[1]) : null;

          // Not a real citation (or a number we don't have): show as plain text
          if (n === null || !valid.has(n)) {
            return <span key={index}>{part}</span>;
          }

          return (
            <sup key={index}>
              <button
                type="button"
                aria-describedby={`source-${messageId}-${n}`}
                onMouseEnter={() => setActive(n)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(n)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(n)}
                className={`mx-0.5 rounded px-1 font-sans text-xs font-medium ${
                  active === n
                    ? "bg-highlight text-slate-900"
                    : "text-muted-foreground underline underline-offset-2"
                }`}
              >
                {n}
              </button>
            </sup>
          );
        })}
      </p>

      {notes.length > 0 && (
        <aside aria-label="Sources" className="mt-6 space-y-4 lg:mt-1">
          {notes.map((source) => (
            <div
              key={source.n}
              id={`source-${messageId}-${source.n}`}
              className={`border-l-4 border-highlight py-1 pl-3 text-sm ${
                active === source.n ? "bg-highlight/30" : ""
              }`}
            >
              <p className="font-medium">
                {source.n} · {source.documentTitle}
                {source.pageNumber ? ` · page ${source.pageNumber}` : ""}
              </p>
              <p className="mt-1 line-clamp-6 text-muted-foreground">
                {source.content}
              </p>
            </div>
          ))}
        </aside>
      )}
    </div>
  );
}