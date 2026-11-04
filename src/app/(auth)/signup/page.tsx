import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/src/components/auth/auth-form";
import { signup } from "@/src/lib/auth/actions";
import { getCurrentUser } from "@/src/lib/auth/current-user";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/library");

  return (
    <>
      <h1 className="font-serif text-3xl font-medium tracking-tight">
        Create your account
      </h1>
      <p className="mt-2 text-muted-foreground">
        Your documents stay private to your account.
      </p>
      <div className="mt-8">
        <AuthForm
          action={signup}
          submitLabel="Create account"
          pendingLabel="Creating account…"
          passwordAutoComplete="new-password"
          passwordHint="Use 8 to 72 characters."
        />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-foreground underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}