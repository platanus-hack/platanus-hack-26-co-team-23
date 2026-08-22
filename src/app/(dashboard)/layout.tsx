import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Menu } from "lucide-react";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

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
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/feed" className="font-bold text-lg">
              CumplAI
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 flex-1 mx-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side: Organization, User, Role Badge */}
          <div className="flex items-center gap-4">
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
                <nav className="flex flex-col gap-4 mt-8">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
