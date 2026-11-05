import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_QUERY_CHARS } from "@/src/lib/constants";

export function SearchForm({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/search" method="get" role="search" className="mt-8 flex gap-3">
      <Label htmlFor="q" className="sr-only">
        Search your documents
      </Label>
      <Input
        id="q"
        name="q"
        defaultValue={defaultValue}
        maxLength={MAX_QUERY_CHARS}
        autoComplete="off"
        placeholder="Describe what you're looking for"
      />
      <Button type="submit">Search</Button>
    </form>
  );
}