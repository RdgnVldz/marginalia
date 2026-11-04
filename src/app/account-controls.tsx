import { ThemeToggle } from "@/src/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { logout } from "@/src/lib/auth/actions";

export function AccountControls() {
  return (
    <div className="flex items-center gap-2">
      <form action={logout}>
        <Button type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>
      <ThemeToggle />
    </div>
  );
}