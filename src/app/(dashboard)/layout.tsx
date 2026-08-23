import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Menu } from "lucide-react";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavLinks } from "./nav-links";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const { sessionClaims, orgRole } = await auth();

  if (!sessionClaims) {
    redirect("/sign-in");
  }

  // Determine role display
  const isAdmin = orgRole === "org:admin";
  const roleBadgeVariant = isAdmin ? "default" : "secondary";
  const roleBadgeText = isAdmin ? "Admin" : "Miembro";

  // Navigation items
  const navItems = [
    { label: "Alertas", href: "/feed" },
    { label: "Configuración", href: "/settings" },
    { label: "API Keys", href: "/keys" },
    ...(isAdmin ? [{ label: "Admin", href: "/admin" }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/feed" className="font-bold text-lg">
              ComplAI
            </Link>
          </div>

          {/* Desktop Navigation */}
          <NavLinks items={navItems} variant="desktop" />

          {/* Right side: Organization, User, Role Badge */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Role Badge */}
            <Badge variant={roleBadgeVariant}>
              {roleBadgeText}
            </Badge>

            {/* Organization Switcher */}
            <div className="hidden sm:block">
              <OrganizationSwitcher />
            </div>

            {/* User Button */}
            <UserButton />

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger
                className="md:hidden"
                render={<Button variant="ghost" size="icon" />}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="mt-8">
                  <NavLinks items={navItems} variant="mobile" />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>
    </div>
  );
}
