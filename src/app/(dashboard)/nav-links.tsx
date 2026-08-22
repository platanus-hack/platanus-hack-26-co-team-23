"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import React from "react";

type NavItem = {
  label: string;
  href: string;
};

type NavLinksProps = {
  items: NavItem[];
  variant?: "desktop" | "mobile";
};

export function NavLinks({ items, variant = "desktop" }: NavLinksProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname.startsWith(href);
  };

  if (variant === "desktop") {
    return (
      <nav className="hidden md:flex items-center gap-6 flex-1 mx-6">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "text-sm font-medium text-foreground border-b-2 border-primary pb-1 transition-colors"
                  : "text-sm text-muted-foreground hover:text-foreground transition-colors"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-4">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "text-sm font-medium text-foreground border-l-2 border-primary pl-3 transition-colors"
                : "text-sm text-muted-foreground hover:text-foreground transition-colors pl-3"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
