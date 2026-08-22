import { Radar, ScanSearch, Users, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STEPS = [
  {
    icon: Radar,
    title: "Ingesta diaria",
    body: "Diario Oficial, SUIN-Juriscol y reguladores sectoriales (DIAN, SFC, SIC), todos los días.",
  },
  {
    icon: ScanSearch,
    title: "Estructuración con IA",
    body: "Por cada norma: emisor, sector afectado, obligaciones que crea o modifica, vigencia.",
  },
  {
    icon: Users,
    title: "Matching con tu perfil",
    body: "Se cruza contra el tipo de empresa, el sector y las obligaciones conocidas de tu compañía.",
  },
  {
    icon: Zap,
    title: "Alerta accionable",
    body: "Qué cambió, cómo te afecta y qué hacer — entregado por el canal que elijas.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-20 md:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight">Cómo funciona</h2>
        <p className="mt-3 text-muted-foreground text-pretty">
          Un pipeline que convierte normativa dispersa en alertas concretas para tu
          empresa, sin que nadie tenga que leer un diario oficial.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <Card key={step.title} className="ring-foreground/10">
            <CardHeader>
              <div className="flex items-center gap-2 text-muted-foreground">
                <step.icon className="size-5" />
                <span className="text-xs font-medium">Paso {i + 1}</span>
              </div>
              <CardTitle className="text-base">{step.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{step.body}</CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
