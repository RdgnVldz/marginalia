"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const INTERVAL_MS = 3000;
const GIVE_UP_AFTER_MS = 5 * 60 * 1000;

// While something is indexing, re-run the server components every few seconds
export function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const startedAt = Date.now();

    const timer = setInterval(() => {
      if (Date.now() - startedAt > GIVE_UP_AFTER_MS) {
        clearInterval(timer);
        return;
      }
      if (!document.hidden) router.refresh(); // skip while the tab is in the background
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, [active, router]);

  return null;
}