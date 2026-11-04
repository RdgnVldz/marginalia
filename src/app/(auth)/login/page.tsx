import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/src/components/auth/auth-form";
import { login } from "@/src/lib/auth/actions";
import { getCurrentUser } from "@/src/lib/auth/current-user";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/library");

  return (
    <>
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