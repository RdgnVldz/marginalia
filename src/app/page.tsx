import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/src/lib/auth/current-user";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <RootRedirect />
    </Suspense>
  );
}

async function RootRedirect() {
  const user = await getCurrentUser();
  return redirect(user ? "/library" : "/login");
}