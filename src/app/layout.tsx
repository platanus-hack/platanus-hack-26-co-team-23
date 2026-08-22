import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import "@clerk/ui/themes/shadcn.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CumplAI",
  description: "La normativa colombiana convertida en un agente que vigila la ley por tu empresa.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider appearance={{ theme: shadcn }}>
      <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
        <body>
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
