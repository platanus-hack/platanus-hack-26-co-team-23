import Link from "next/link";
import { CheckCircle2, GitPullRequest } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const POINTS = [
  "Analiza tu codebase con el contexto que tú declares en COMPLIA.md",
  "Filtra por relevancia: solo abre PR si la norma realmente regula lo que hace tu código",
  "Pull Request en draft, asignado al revisor responsable que tú elijas",
  "Nunca hace merge automático — el humano siempre aprueba o rechaza",
];

export function ProSpotlight() {
  return (
    <section id="pro" className="mx-auto max-w-6xl px-4 py-20 md:px-6">
      <Card className="overflow-hidden bg-foreground text-background ring-0">
        <CardContent className="grid grid-cols-1 gap-10 p-8 md:grid-cols-2 md:p-12">
          <div>
            <Badge className="bg-background text-foreground">PRO</Badge>
            <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-pretty">
              De &ldquo;te aviso&rdquo; a &ldquo;te traigo el Pull Request&rdquo;
            </h2>
            <p className="mt-4 text-background/70 text-pretty">
              Cuando una norma nueva sí afecta tu código, un agente lee tu
              repositorio, identifica dónde incumple y abre un Pull Request con el
              cambio propuesto — asignado al revisor que tú definas. complAI jamás
              mergea: la última palabra siempre es humana.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="mt-6 bg-background text-foreground hover:bg-background/90"
              nativeButton={false} render={<Link href="/sign-up" />}
            >
              Comenzar con PRO
            </Button>
          </div>

          <ul className="space-y-4">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-background/70" />
                <span className="text-sm text-background/90">{point}</span>
              </li>
            ))}
            <li className="flex items-start gap-3 rounded-lg border border-background/20 p-3">
              <GitPullRequest className="mt-0.5 size-5 shrink-0 text-background/70" />
              <span className="text-sm text-background/90">
                Abierto por <span className="font-mono">complia-app</span>, en menos
                de un minuto desde que se detecta el impacto.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
