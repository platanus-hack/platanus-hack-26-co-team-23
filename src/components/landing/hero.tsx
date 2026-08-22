import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,var(--color-muted),transparent)]"
      />

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 py-20 md:grid-cols-2 md:items-center md:px-6 md:py-28">
        <div>
          <Badge variant="secondary" className="mb-5">
            <Sparkles data-icon="inline-start" />
            Cumplimiento normativo con IA · Colombia
          </Badge>

          <h1 className="font-heading text-4xl leading-[1.1] font-bold tracking-tight text-balance sm:text-5xl">
            La ley colombiana cambia todos los días.{" "}
            <span className="text-muted-foreground">Tu empresa no tiene por qué perseguirla.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-muted-foreground text-pretty">
            complAI vigila el Diario Oficial y SUIN-Juriscol, cruza cada norma nueva
            contra el perfil de tu empresa y te avisa por el canal que elijas: qué
            cambió, cómo te afecta y qué hacer. En el plan PRO, además, te abre el
            Pull Request que te pone en cumplimiento.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" nativeButton={false} render={<Link href="/sign-up" />}>
              Comenzar gratis
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button size="lg" variant="outline" nativeButton={false} render={<Link href="#pro" />}>
              Ver el plan PRO
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Sin tarjeta de crédito · Configura tu empresa en 2 minutos
          </p>
        </div>

        <Card className="ring-foreground/10 shadow-lg">
          <CardHeader className="border-b pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Nueva alerta · Slack</CardTitle>
              <Badge variant="destructive">Severidad alta</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-sm">
            <p className="font-medium">
              Resolución DIAN — campos obligatorios en factura electrónica
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Qué cambió: </span>
              se agregan 3 campos obligatorios a partir del próximo ciclo de
              facturación.
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Cómo te afecta: </span>
              tu módulo de facturación electrónica queda fuera de norma si no se
              actualiza.
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Qué hacer: </span>
              revisa el Pull Request ya abierto en{" "}
              <span className="font-mono text-foreground">facturador/</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
