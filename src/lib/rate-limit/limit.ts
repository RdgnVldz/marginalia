import "server-only";
import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { LimitRule } from "./rules";

export type LimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number; message: string };

const configured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);
let warned = false;

let redis: Redis | undefined;
// Created once per server instance, not per request
const limiters = new Map<string, Ratelimit>();

function limiterFor(rule: LimitRule) {
  redis ??= Redis.fromEnv();
  let limiter = limiters.get(rule.id);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      prefix: `marginalia:${rule.id}`,
      // If Redis doesn't answer in time, the check resolves as "allowed"
      timeout: 3000,
      limiter:
        rule.algo === "fixed"
          ? Ratelimit.fixedWindow(rule.max, rule.window)
          : Ratelimit.slidingWindow(rule.max, rule.window),
    });
    limiters.set(rule.id, limiter);
  }
  return limiter;
}

// Checks each rule in order and stops at the first one that blocks.
export async function enforceLimits(
  identifier: string,
  rules: LimitRule[],
): Promise<LimitResult> {
  if (!configured) {
    // Fine in local development. In production this means protection is off.
    if (process.env.NODE_ENV === "production" && !warned) {
      warned = true;
      console.error("Rate limiting is OFF: Upstash environment variables are missing.");
    }
    return { allowed: true };
  }

  for (const rule of rules) {
    try {
      const { success, reset } = await limiterFor(rule).limit(
        rule.global ? "all" : identifier,
      );
      if (!success) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
          message: rule.message,
        };
      }
    } catch (error) {
      // Fail open: a Redis outage shouldn't lock everyone out
      console.error(`Rate limit check failed (${rule.id})`, error);
    }
  }
  return { allowed: true };
}

// The client's IP. On Vercel, x-forwarded-for is set by the platform.
export async function clientIp() {
  const requestHeaders = await headers();
  return (
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "local"
  );
}

// Keep raw emails out of Redis keys
export function hashIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export function tooManyRequests(
  result: Extract<LimitResult, { allowed: false }>,
) {
  return NextResponse.json(
    { error: result.message },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    },
  );
}