import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/src/components/auth/auth-form";
import { RedirectIfSignedIn } from "@/src/components/auth/redirect-if-signed-in";
import { login } from "@/src/lib/auth/actions";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>

      <h1 className="font-serif text-3xl font-medium tracking-tight">
        Sign in to Marginalia
      </h1>
      <p className="mt-2 text-muted-foreground">
        Ask questions about your own documents and see exactly where each
        answer comes from.
      </p>
      <div className="mt-8">
        <AuthForm
          action={login}
          submitLabel="Sign in"
          pendingLabel="Signing in…"
          passwordAutoComplete="current-password"
        />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href="/signup"
          className="text-foreground underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}