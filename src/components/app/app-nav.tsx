"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/library", label: "Library" },
  { href: "/search", label: "Search" },
];

export function AppNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={className}>
      {links.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={
              active ? "font-medium text-foreground" : "text-muted-foreground"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}