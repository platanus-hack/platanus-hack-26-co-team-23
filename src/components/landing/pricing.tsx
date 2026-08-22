import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    description: "Para conocer qué normas afectan a tu empresa.",
    features: [
      "Perfil de empresa (tipo, sector, obligaciones)",
      "Feed de normas relevantes en el dashboard",
      "Histórico de alertas",
    ],
    cta: "Comenzar gratis",
  },
  {
    name: "Plus",
    price: "A la medida",
    description: "Para que la alerta llegue antes de que se convierta en multa.",
    features: [
      "Todo lo de Free",
      "Alertas por Slack, Google Chat, Teams, Discord, email y WhatsApp",
      "Llamada de voz para normas de severidad alta",
    ],
    cta: "Comenzar gratis",
    highlighted: true,
    badge: "Más popular",
  },
  {
    name: "PRO",
    price: "A la medida",
    description: "Para pasar de la alerta al código en cumplimiento.",
    features: [
      "Todo lo de Plus",
      "Análisis de tu codebase y Pull Request de cumplimiento",
      "Revisor responsable asignado por norma",
      "Acceso a la API / MCP para tus propios agentes",
    ],
    cta: "Comenzar con PRO",
  },
];

export function Pricing() {
  return (
    <section id="planes" className="mx-auto max-w-6xl px-4 py-20 md:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight">Planes</h2>
        <p className="mt-3 text-muted-foreground text-pretty">
          Empieza gratis para enterarte a tiempo. Sube a PRO cuando quieras que
          complAI también te traiga el cambio de código.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        {TIERS.map((tier) => (
          <Card
            key={tier.name}
            className={cn(
              "flex flex-col ring-foreground/10",
              tier.highlighted && "ring-2 ring-foreground"
            )}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{tier.name}</CardTitle>
                {tier.badge && <Badge>{tier.badge}</Badge>}
              </div>
              <p className="font-heading text-2xl font-bold">{tier.price}</p>
              <p className="text-sm text-muted-foreground">{tier.description}</p>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={tier.highlighted ? "default" : "outline"}
                nativeButton={false} render={<Link href="/sign-up" />}
              >
                {tier.cta}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Plus y PRO se activan desde el dashboard una vez que creas tu empresa.
      </p>
    </section>
  );
}
