"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function IndexButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? "Indexing…" : label}
    </Button>
  );
}