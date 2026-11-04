import { z } from "zod";

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

export const signupSchema = z.object({
  email: emailField,
  // bcrypt only reads the first 72 bytes, so we cap the length
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(72, "Use 72 characters or fewer."),
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password."),
});

export type FormState =
  | {
      errors?: { email?: string[]; password?: string[] };
      message?: string;
      // Sent back so the email field isn't cleared after an error
      email?: string;
    }
  | undefined;

// Turns Zod's list of issues into { email: [...], password: [...] }
export function collectErrors(
  issues: { path: PropertyKey[]; message: string }[],
) {
  const errors: { email?: string[]; password?: string[] } = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (key === "email" || key === "password") {
      (errors[key] ??= []).push(issue.message);
    }
  }
  return errors;
}