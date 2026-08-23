"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** The four public-record lookups, in the order they typically answer. */
const SOURCES = [
  { id: "registraduria", label: "Registraduría", hint: "cédula" },
  { id: "procuraduria", label: "Procuraduría", hint: "antecedentes" },
  { id: "adres", label: "ADRES", hint: "salud" },
  { id: "contaduria", label: "Contaduría", hint: "deudas con el Estado" },
] as const;

type SourceState = { status: "idle" | "loading" | "ok" | "error"; ms?: number; error?: string };
type Profile = {
  nombre: string | null; cedulaValida: boolean | null; eps: string | null;
  regimen: string | null; tieneAntecedentes: boolean | null; deudorDelEstado: boolean | null;
};
type Match = {
  id: string; title: string; summary: string | null; severity: string | null;
  url: string | null; issuer: string | null; porQue: string;
};

const SEV: Record<string, { label: string; variant: "destructive" | "default" | "outline" }> = {
  high: { label: "Alta", variant: "destructive" },
  medium: { label: "Media", variant: "default" },
  low: { label: "Baja", variant: "outline" },
};

export function CitizenScan() {
  const [cedula, setCedula] = useState("");
  const [running, setRunning] = useState(false);
  const [sources, setSources] = useState<Record<string, SourceState>>({});
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const start = () => {
    if (!/^\d{6,10}$/.test(cedula)) { setError("Escribe una cédula de 6 a 10 dígitos."); return; }
    esRef.current?.close();
    setError(null); setProfile(null); setMatches(null); setRunning(true);
    setSources(Object.fromEntries(SOURCES.map((s) => [s.id, { status: "loading" }])));

    // SSE: each lookup paints the moment it answers instead of waiting for the slowest.
    const es = new EventSource(`/api/citizen/scan?cedula=${cedula}`);
    esRef.current = es;
    es.addEventListener("source", (e) => {
      const r = JSON.parse((e as MessageEvent).data);
      setSources((prev) => ({ ...prev, [r.source]: r.ok ? { status: "ok", ms: r.ms } : { status: "error", ms: r.ms, error: r.error } }));
    });
    es.addEventListener("matches", (e) => setMatches(JSON.parse((e as MessageEvent).data).matches));
    es.addEventListener("done", (e) => {
      setProfile(JSON.parse((e as MessageEvent).data).profile);
      setRunning(false); es.close();
    });
    es.onerror = () => { setRunning(false); setError("Se interrumpió la consulta. Intenta de nuevo."); es.close(); };
  };

  return (
    <section id="ciudadano" className="border-t bg-muted/30 py-16">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-8 text-center">
          <Badge variant="outline" className="mb-3">Gratis · sin crear cuenta</Badge>
          <h2 className="text-3xl font-bold">¿Qué normativa te afecta a ti?</h2>
          <p className="mt-2 text-muted-foreground">
            Con tu cédula consultamos registros públicos oficiales y te decimos qué normas
            colombianas te aplican y por qué. Sin registro, sin costo.
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            inputMode="numeric" placeholder="Tu número de cédula" value={cedula}
            onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && !running && start()}
            disabled={running} aria-label="Número de cédula"
          />
          <Button onClick={start} disabled={running}>
            {running ? "Consultando…" : "Ver qué me aplica"}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

        {/* Progress per source: the slow one (Contaduría, ~1 min) shouldn't hide the rest. */}
        {Object.keys(sources).length > 0 && (
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {SOURCES.map((s) => {
              const st = sources[s.id] ?? { status: "idle" as const };
              const icon = st.status === "ok" ? "✅" : st.status === "error" ? "⚠️" : "⏳";
              return (
                <div key={s.id} className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
                  <span>{icon} {s.label} <span className="text-muted-foreground">· {s.hint}</span></span>
                  <span className="text-xs text-muted-foreground">
                    {st.status === "loading" ? "consultando…" : st.ms ? `${(st.ms / 1000).toFixed(1)}s` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {profile && (
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{profile.nombre ?? "Tu perfil"}</CardTitle>
              <CardDescription>Lo que dicen los registros públicos sobre ti</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 text-sm">
              {profile.eps && <Badge variant="outline">EPS: {profile.eps}</Badge>}
              {profile.regimen && <Badge variant="outline">Régimen: {profile.regimen}</Badge>}
              {profile.tieneAntecedentes !== null && (
                <Badge variant="outline">
                  {profile.tieneAntecedentes ? "Con antecedentes disciplinarios" : "Sin antecedentes disciplinarios"}
                </Badge>
              )}
              {profile.deudorDelEstado !== null && (
                <Badge variant="outline">
                  {profile.deudorDelEstado ? "Reportado como deudor del Estado" : "Sin deudas con el Estado"}
                </Badge>
              )}
            </CardContent>
          </Card>
        )}

        {matches && (
          <div className="mt-6 space-y-3">
            <h3 className="font-semibold">
              {matches.length ? `${matches.length} normas que te aplican` : "No encontramos normas que te apliquen"}
            </h3>
            {matches.map((m) => (
              <Card key={m.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base leading-snug">{m.title}</CardTitle>
                    {m.severity && SEV[m.severity] && (
                      <Badge variant={SEV[m.severity].variant}>{SEV[m.severity].label}</Badge>
                    )}
                  </div>
                  <CardDescription>{m.issuer}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {m.summary && <p>{m.summary}</p>}
                  <p className="text-muted-foreground">Por qué te aparece: {m.porQue}</p>
                  {m.url && (
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-sm underline">
                      Ver norma oficial
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          Consultamos Registraduría, Procuraduría, ADRES y Contaduría General de la Nación —
          registros públicos oficiales. Guardamos la consulta para mejorar el servicio.
          Esto no constituye asesoría jurídica.
        </p>
      </div>
    </section>
  );
}
