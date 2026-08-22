import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { Stats } from "@/components/landing/stats";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Channels } from "@/components/landing/channels";
import { ProSpotlight } from "@/components/landing/pro-spotlight";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { SiteFooter } from "@/components/landing/site-footer";

export default async function Home() {
  const { sessionClaims } = await auth();

  if (sessionClaims) {
    redirect("/feed");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Stats />
        <HowItWorks />
        <Channels />
        <ProSpotlight />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
