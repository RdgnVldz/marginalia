"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCEPTED_FILE_TYPES, MAX_FILE_BYTES } from "@/src/lib/constants";

const MAX_MB = MAX_FILE_BYTES / 1024 / 1024;

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    // Quick check so people don't wait for a doomed upload.
    // The server checks again, because this one can be bypassed.
    if (file.size > MAX_FILE_BYTES) {
      setError(`That file is larger than ${MAX_MB} MB.`);
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/documents", { method: "POST", body });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "Upload failed. Try again.");
        return;
      }

      const data = await response.json().catch(() => null);
      if (data?.status === "failed") {
        setError(`Saved, but indexing failed: ${data.error ?? "try again from the list."}`);
      }

      if (inputRef.current) inputRef.current.value = "";
      router.refresh();

      if (inputRef.current) inputRef.current.value = "";
      router.refresh(); // re-run the server components so the list updates
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Label htmlFor="file">Add a document</Label>
      <div className="flex gap-3">
        <Input
          id="file"
          ref={inputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          aria-describedby="file-hint"
        />
        <Button type="submit" disabled={uploading}>
          {uploading ? "Uploading and indexing…" : "Upload"}
        </Button>
      </div>
      <p id="file-hint" className="text-sm text-muted-foreground">
        PDF, TXT or Markdown, up to {MAX_MB} MB. The text is extracted and
        stored; the original file isn't kept. To make documents searchable,
        their text is sent to Google's Gemini API, so don't upload anything
        confidential.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}