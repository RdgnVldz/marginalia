import { google } from "@ai-sdk/google";
import {
  APICallError,
  convertToModelMessages,
  streamText,
  validateUIMessages,
} from "ai";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth/current-user";
import { CHAT_MODEL_ID } from "@/src/lib/ai/models";
import { MAX_CHAT_MESSAGES, MAX_QUESTION_CHARS } from "@/src/lib/constants";
import { buildSystemPrompt } from "@/src/lib/chat/prompt";
import type { ChatMessage, ChatSource } from "@/src/lib/chat/types";
import { searchPassages } from "@/src/lib/search/search";

import { enforceLimits, tooManyRequests } from "@/src/lib/rate-limit/limit";
import { CHAT_RULES } from "@/src/lib/rate-limit/rules";

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function friendlyError(error: unknown): string {
  if (APICallError.isInstance(error) && error.statusCode === 429) {
    return "The AI service is busy or the free quota is used up. Try again in a few minutes.";
  }
  return "Something went wrong while writing the answer. Try again.";
}

function textOf(message: ChatMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export async function POST(request: Request) {
  // Same-origin check, as in the upload endpoint
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return fail("Forbidden.", 403);
  }

  const user = await getCurrentUser();
  if (!user) return fail("Sign in to ask questions.", 401);

  const limited = await enforceLimits(user.id, CHAT_RULES);
  if (!limited.allowed) return tooManyRequests(limited);

  // The browser sends the whole conversation, so treat it as untrusted input
  let messages: ChatMessage[];
  try {
    const body = (await request.json()) as { messages?: unknown };
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return fail("Invalid request.", 400);
    }
    messages = await validateUIMessages<ChatMessage>({
      messages: body.messages,
    });
  } catch {
    return fail("Invalid request.", 400);
  }

  const last = messages[messages.length - 1];
  if (last.role !== "user") return fail("Invalid request.", 400);

  const question = textOf(last);
  if (question.length < 2 || question.length > MAX_QUESTION_CHARS) {
    return fail(
      `Questions must be between 2 and ${MAX_QUESTION_CHARS} characters.`,
      400,
    );
  }

  // Keep only recent history, and make sure it starts with a user message
  const recent = messages.slice(-MAX_CHAT_MESSAGES);
  while (recent[0]?.role === "assistant") recent.shift();

  // 1. Retrieve (always scoped to this user)
  const found = await searchPassages(user.id, question);
  if (!found.ok) return fail(found.message, 503);

  const sources: ChatSource[] = found.results.map((result, index) => ({
    n: index + 1,
    ...result,
  }));

  // 2 + 3. Augment the prompt and generate, streaming the answer back
  const result = streamText({
    model: google(CHAT_MODEL_ID),
    system: buildSystemPrompt(sources),
    messages: await convertToModelMessages(recent),
    maxOutputTokens: 800,
    maxRetries: 2,
    abortSignal: request.signal, // stop generating if the user leaves or clicks Stop
  });

  return result.toUIMessageStreamResponse<ChatMessage>({
    // Attach the sources to the assistant message when it starts
    messageMetadata: ({ part }) =>
      part.type === "start" ? { sources } : undefined,
    onError: (error) => {
      console.error("Chat stream failed", error);
      return friendlyError(error);
    },
  });
}