import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth/current-user";

// Renders nothing. It only redirects when someone is already signed in.
export async function RedirectIfSignedIn() {
  if (await getCurrentUser()) redirect("/library");
  return null;
}