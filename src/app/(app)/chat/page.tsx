import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChatPanel } from "@/src/components/chat/chat-panel";
import { requireUser } from "@/src/lib/auth/current-user";
import { countSearchablePassages } from "@/src/lib/documents/queries";

export const metadata: Metadata = { title: "Ask" };

export default function ChatPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-serif text-3xl font-medium tracking-tight">
        Ask your documents
      </h1>
      <Suspense
        fallback={
          <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        }
      >
        <ChatGate />
      </Suspense>
    </div>
  );
}

async function ChatGate() {
  const user = await requireUser();

  if ((await countSearchablePassages(user.id)) === 0) {
    return (
      <p className="mt-6 max-w-prose text-muted-foreground">
        There&apos;s nothing to ask about yet. Add a document in your{" "}
        <Link
          href="/library"
          className="text-foreground underline underline-offset-4"
        >
          Library
        </Link>{" "}
        and wait until it says Ready.
      </p>
    );
  }

  return <ChatPanel />;
}