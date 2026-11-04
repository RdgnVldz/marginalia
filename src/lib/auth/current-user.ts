import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/src/db";
import { sessions, users } from "@/src/db/schema";
import { SESSION_COOKIE, hashToken } from "./session";

// cache() makes repeated calls within one request hit the database only once
export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.tokenHash, hashToken(token)))
    .limit(1);

  // Expired sessions are treated as signed out. We can't delete the cookie
  // here, because cookies can only be changed in actions and route handlers.
  if (!row || row.expiresAt < new Date()) return null;

  return { id: row.id, email: row.email };
});

// Use this at the top of any protected page, layout or action
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}