import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Alert, Norm } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AlertWithNorm = Alert & { norm: Norm };

export default async function FeedPage() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  // Fetch company
  let company = null;
  try {
    const admin = supabaseAdmin();
    const { data } = await admin
      .from("companies")
      .select("id")
      .eq("clerk_org_id", orgId)
      .single();
    company = data;
  } catch (error) {
    console.error("Error fetching company:", error);
  }

  // Fetch alerts with norms
  let alerts: AlertWithNorm[] = [];
  if (company) {
    try {
      const admin = supabaseAdmin();
      const { data } = await admin
        .from("alerts")
        .select("*, norms(*)")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      alerts = (data || []) as AlertWithNorm[];
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  }

  if (!company) {
    return (
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Alertas</h1>
          <p className="text-muted-foreground">
            Aquí verás las alertas de compliance relevantes para tu empresa.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">
              Tu organización aún no ha configurado ComplAI. Completa tu configuración de empresa para empezar a recibir alertas.
            </p>
            <Link href="/settings">
              <Button>Ir a Configuración</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Alertas</h1>
          <p className="text-muted-foreground">
            Aquí verás las alertas de compliance relevantes para tu empresa.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              No hay alertas en este momento. Te notificaremos cuando se detecten normas relevantes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Alertas</h1>
        <p className="text-muted-foreground">
          {alerts.length} {alerts.length === 1 ? "alerta" : "alertas"} activas
        </p>
      </div>

      <div className="space-y-4">
        {alerts.map((alert) => (
          <Card key={alert.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {alert.norm?.title || "Norma sin título"}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {alert.norm?.issuer && (
                      <>
                        Emitida por: <span className="text-foreground font-medium">{alert.norm.issuer}</span>
                      </>
                    )}
                  </CardDescription>
                </div>
                {alert.norm?.severity && (
                  <Badge
                    variant={
                      alert.norm.severity === "high"
                        ? "destructive"
                        : alert.norm.severity === "medium"
                          ? "default"
                          : alert.norm.severity === "low"
                            ? "secondary"
                            : "outline"
                    }
                  >
                    {alert.norm.severity === "high"
                      ? "Alta"
                      : alert.norm.severity === "medium"
                        ? "Media"
                        : alert.norm.severity === "low"
                          ? "Baja"
                          : "Info"}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {alert.norm?.summary && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Resumen</p>
                  <p className="text-sm">{alert.norm.summary}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-1">Impacto en tu empresa</p>
                <p className="text-sm">{alert.impact}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Recomendación</p>
                <p className="text-sm">{alert.recommendation}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex gap-2">
                  {alert.norm?.url && (
                    <a
                      href={alert.norm.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        Ver norma
                      </Button>
                    </a>
                  )}
                  {alert.pr_url && (
                    <a
                      href={alert.pr_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        Ver PR
                      </Button>
                    </a>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(alert.created_at).toLocaleDateString("es-CO")}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
