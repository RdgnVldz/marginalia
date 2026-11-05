"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_QUESTION_CHARS } from "@/src/lib/constants";
import type { ChatMessage } from "@/src/lib/chat/types";
import { AssistantMessage } from "./assistant-message";

function textOf(message: ChatMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

// Failed requests arrive as JSON text like {"error":"..."}
function readError(error: Error) {
  try {
    const parsed = JSON.parse(error.message);
    if (typeof parsed?.error === "string") return parsed.error;
  } catch {
    // not JSON: fall through
  }
  return error.message || "Something went wrong. Try again.";
}

export function ChatPanel() {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, stop, setMessages } =
    useChat<ChatMessage>({
      transport: new DefaultChatTransport({ api: "/api/chat" }),
    });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  function submit() {
    const text = input.trim();
    if (!text || busy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="mt-8">
      {messages.length === 0 && (
        <p className="max-w-prose text-muted-foreground">
          Ask a question about your documents. Answers are written from the
          passages we find, and the numbers in the answer point to those
          passages in the margin.
        </p>
      )}

      <div className="space-y-10">
        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id}>
              <p className="text-sm text-muted-foreground">You</p>
              <p className="mt-1 max-w-prose whitespace-pre-wrap">
                {textOf(message)}
              </p>
            </div>
          ) : (
            <AssistantMessage
              key={message.id}
              messageId={message.id}
              text={textOf(message)}
              sources={message.metadata?.sources ?? []}
            />
          ),
        )}

        {status === "submitted" && (
          <p className="text-sm text-muted-foreground">
            Searching your documents…
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {readError(error)}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 mt-10 border-t border-border bg-background py-4">
        <div className="flex gap-3">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends, Shift+Enter adds a new line
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                submit();
              }
            }}
            maxLength={MAX_QUESTION_CHARS}
            rows={2}
            aria-label="Your question"
            placeholder="Ask about your documents"
          />
          <div className="flex flex-col gap-2">
            {busy ? (
              <Button type="button" variant="outline" onClick={() => stop()}>
                Stop
              </Button>
            ) : (
              <Button type="button" onClick={submit} disabled={!input.trim()}>
                Ask
              </Button>
            )}
            {messages.length > 0 && !busy && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMessages([])}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Answers are written by an AI model and can be wrong. Check the cited
          passages. Your question and the matching passages are sent to
          Google&apos;s Gemini API.
        </p>
      </div>
    </div>
  );
}