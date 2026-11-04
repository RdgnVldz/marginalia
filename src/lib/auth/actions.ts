"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/src/db";
import { users } from "@/src/db/schema";
import { createSession, destroySession } from "./session";
import {
  collectErrors,
  loginSchema,
  signupSchema,
  type FormState,
} from "./validation";

const BCRYPT_ROUNDS = 12;

// Used when the email doesn't exist, so a login attempt takes the same time
// either way and can't be used to discover which emails have accounts.
let dummyHash: string | undefined;
function getDummyHash() {
  dummyHash ??= bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);
  return dummyHash;
}

export async function signup(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: collectErrors(parsed.error.issues), email };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);
  if (existing) {
    return {
      errors: { email: ["An account with this email already exists."] },
      email,
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS);
  const [user] = await db
    .insert(users)
    .values({ email: parsed.data.email, passwordHash })
    .returning({ id: users.id });

  await createSession(user.id);
  redirect("/library"); // throws internally, so keep it outside any try/catch
}

export async function login(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: collectErrors(parsed.error.issues), email };
  }

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  const valid = await bcrypt.compare(
    parsed.data.password,
    user?.passwordHash ?? getDummyHash(),
  );
  if (!user || !valid) {
    // One message for both cases, so attackers learn nothing
    return { message: "Email or password is incorrect.", email };
  }

  await createSession(user.id);
  redirect("/library");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}