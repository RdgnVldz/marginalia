import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/src/components/auth/auth-form";
import { RedirectIfSignedIn } from "@/src/components/auth/redirect-if-signed-in";
import { signup } from "@/src/lib/auth/actions";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>

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