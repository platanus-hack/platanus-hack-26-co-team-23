import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center md:px-6">
        <h2 className="max-w-2xl font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          La ley ya es demasiado rápida para leerla a mano.
        </h2>
        <p className="max-w-xl text-muted-foreground text-pretty">
          Configura el perfil de tu empresa en dos minutos y deja que complAI
          vigile la normativa colombiana por ti.
        </p>
        <Button size="lg" nativeButton={false} render={<Link href="/sign-up" />}>
          Comenzar gratis
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </section>
  );
}
