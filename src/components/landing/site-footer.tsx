import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center md:flex-row md:justify-between md:px-6 md:text-left">
        <div>
          <p className="font-heading font-bold">ComplAI</p>
          <p className="text-sm text-muted-foreground">
            La normativa colombiana convertida en un agente que vigila la ley por tu empresa.
          </p>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="#como-funciona" className="hover:text-foreground">
            Cómo funciona
          </Link>
          <Link href="#planes" className="hover:text-foreground">
            Planes
          </Link>
          <Link href="/sign-in" className="hover:text-foreground">
            Iniciar sesión
          </Link>
        </div>
      </div>

      <div className="border-t border-border py-4">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ComplAI · Platanus Hack 2026
        </p>
      </div>
    </footer>
  );
}
