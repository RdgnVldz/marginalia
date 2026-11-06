export type LimitRule = {
  id: string; // also used as the Redis key prefix
  max: number;
  window: `${number} ${"s" | "m" | "h" | "d"}`;
  algo: "sliding" | "fixed";
  message: string; // shown to the user when this rule blocks them
  global?: boolean; // one shared counter for the whole app
};

// Whole-demo daily circuit breaker. Set it a little below your real Gemini
// free-tier daily quota (see AI Studio), and tune it after you've watched usage.
const GLOBAL_AI_DAILY: LimitRule = {
  id: "ai-global-day",
  max: 300,
  window: "1 d",
  algo: "fixed",
  global: true,
  message:
    "This demo has used up its free AI allowance for today. Please try again tomorrow.",
};

export const CHAT_RULES: LimitRule[] = [
  {
    id: "chat-min",
    max: 6,
    window: "1 m",
    algo: "sliding",
    message: "You're asking questions quickly. Wait a moment and try again.",
  },
  {
    id: "chat-day",
    max: 60,
    window: "1 d",
    algo: "fixed",
    message: "You've reached today's question limit. It resets tomorrow.",
  },
  GLOBAL_AI_DAILY,
];

export const SEARCH_RULES: LimitRule[] = [
  {
    id: "search-min",
    max: 15,
    window: "1 m",
    algo: "sliding",
    message: "You're searching quickly. Wait a moment and try again.",
  },
  {
    id: "search-day",
    max: 150,
    window: "1 d",
    algo: "fixed",
    message: "You've reached today's search limit. It resets tomorrow.",
  },
  GLOBAL_AI_DAILY,
];

// Uploads (and retrying indexing) cause many embedding calls
export const UPLOAD_RULES: LimitRule[] = [
  {
    id: "upload-hour",
    max: 6,
    window: "1 h",
    algo: "sliding",
    message: "You've added several documents recently. Try again in a little while.",
  },
  {
    id: "upload-day",
    max: 20,
    window: "1 d",
    algo: "fixed",
    message: "You've reached today's upload limit. It resets tomorrow.",
  },
  GLOBAL_AI_DAILY,
];

export const SIGNUP_IP_RULES: LimitRule[] = [
  {
    id: "signup-ip-hour",
    max: 5,
    window: "1 h",
    algo: "sliding",
    message: "Too many accounts were created from this network. Try again later.",
  },
];

export const LOGIN_IP_RULES: LimitRule[] = [
  {
    id: "login-ip",
    max: 20,
    window: "10 m",
    algo: "sliding",
    message: "Too many sign-in attempts. Wait a few minutes and try again.",
  },
];

export const LOGIN_EMAIL_RULES: LimitRule[] = [
  {
    id: "login-email",
    max: 6,
    window: "15 m",
    algo: "sliding",
    message: "Too many sign-in attempts for this account. Try again in 15 minutes.",
  },
];