import "server-only";

// A Gemini model available on the free tier. Override with CHAT_MODEL in .env
// if a quota runs out or a model is retired.
export const CHAT_MODEL_ID = process.env.CHAT_MODEL ?? "gemini-3.5-flash-lite";