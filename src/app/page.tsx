import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth/current-user";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? "/library" : "/login");
}