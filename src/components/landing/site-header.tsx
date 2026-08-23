import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="font-heading text-lg font-bold tracking-tight">
          ComplAI
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link href="#como-funciona" className="hover:text-foreground">
            Cómo funciona
          </Link>
          <Link href="#pro" className="hover:text-foreground">
            PRO
          </Link>
          <Link href="#planes" className="hover:text-foreground">
            Planes
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            className="hidden sm:inline-flex"
            nativeButton={false} render={<Link href="/sign-in" />}
          >
            Iniciar sesión
          </Button>
          <Button nativeButton={false} render={<Link href="/sign-up" />}>Comenzar gratis</Button>
        </div>
      </div>
    </header>
  );
}
