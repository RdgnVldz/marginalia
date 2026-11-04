import Link from "next/link";
import { AccountControls } from "@/src/app/account-controls";
import { requireUser } from "@/src/lib/auth/current-user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border p-6 md:flex">
        <Link href="/library" className="font-serif text-xl font-medium">
          Marginalia
        </Link>
        <nav className="mt-8 text-sm">
          <Link href="/library" className="font-medium">
            Library
          </Link>
        </nav>
        <div className="mt-auto space-y-3 text-sm">
          <p className="truncate text-muted-foreground" title={user.email}>
            {user.email}
          </p>
          <AccountControls />
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-border px-6 py-4 md:hidden">
          <Link href="/library" className="font-serif text-lg font-medium">
            Marginalia
          </Link>
          <AccountControls />
        </header>
        {children}
      </div>
    </div>
  );
}