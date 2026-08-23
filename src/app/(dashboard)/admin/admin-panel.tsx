"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { runManualUpdate, runManualNotification } from "./actions";
import { sanitizeCount, isValidCount, clampCount, MIN, MAX, SOURCES } from "./count";
// Type-only: erased at compile time, so the server-side broadcast helper never reaches the client bundle.
import type { IngestProgress } from "@/lib/ingest/progress";

// Fetch phase fills the first half of the bar, analyze the second — one smooth 0→100 bar.
function overallPct(p: IngestProgress): number {
  if (p.phase === "fetch") return p.total ? (p.done / p.total) * 50 : 0;
  if (p.phase === "analyze") return 50 + (p.total ? (p.done / p.total) * 50 : 50);
  if (p.phase === "done") return 100;
  return 0;
}

function progressLabel(p: IngestProgress): string {
  if (p.phase === "fetch") return `Trayendo fuentes… ${p.done}/${p.total}`;
  if (p.phase === "analyze")
    return p.total ? `Analizando con IA… ${p.done}/${p.total}` : "Sin normas nuevas para analizar";
  if (p.phase === "done") return `Listo · ${p.nuevas} nuevas · ${p.analyzed} analizadas`;
  return `Error: ${p.message}`;
}

export function AdminPanel() {
  // Kept as a string so the field can be emptied while typing — see ./count.ts.
  const [maxNews, setMaxNews] = useState("5");
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<"update" | "notify" | null>(null);
  const [progress, setProgress] = useState<IngestProgress | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // Close any live stream if the admin navigates away mid-ingest.
  useEffect(() => () => esRef.current?.close(), []);

  const n = Number(maxNews);
  const valid = isValidCount(maxNews);
  const ingesting = progress != null && progress.phase !== "done" && progress.phase !== "error";

  const onUpdate = () => {
    if (!valid || ingesting) return;
    setAction("update");
    // Optimistic first frame so the bar appears the instant the button is pressed.
    setProgress({ phase: "fetch", done: 0, total: SOURCES, source: "" });

    const runId = crypto.randomUUID();
    esRef.current?.close();
    const es = new EventSource(`/api/ingest/progress?run=${runId}`);
    esRef.current = es;
    es.addEventListener("progress", (e) => {
      const p = JSON.parse((e as MessageEvent).data) as IngestProgress;
      setProgress(p);
      if (p.phase === "done") {
        es.close();
        toast.success("Ingesta completa", {
          description: `${p.nuevas} normas nuevas · ${p.analyzed} analizadas. Ya puedes pulsar 'Ejecutar notificación'.`,
        });
      }
    });

    startTransition(async () => {
      const r = await runManualUpdate(n, runId);
      if (!r.ok) {
        es.close();
        setProgress(null);
        toast.error(`No se pudo iniciar: ${r.error}`);
      }
      setAction(null);
    });
  };

  const onNotify = () => {
    setAction("notify");
    startTransition(async () => {
      const r = await runManualNotification();
      if (r.ok) toast.success("Notificación iniciada", { description: "Corre en segundo plano. Las alertas nuevas aparecen en el feed." });
      else toast.error(`No se pudo iniciar: ${r.error}`);
      setAction(null);
    });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Manual update</CardTitle>
          <CardDescription>Trae normativa nueva de las fuentes y la analiza (en segundo plano).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maxNews">Normas por fuente ({MIN}–{MAX})</Label>
            <Input
              id="maxNews"
              type="number"
              inputMode="numeric"
              min={MIN}
              max={MAX}
              value={maxNews}
              onChange={(e) => setMaxNews(sanitizeCount(e.target.value))}
              onBlur={() => setMaxNews(clampCount(maxNews))}
              disabled={pending}
              aria-invalid={!valid}
            />
            <p className="text-xs text-muted-foreground">
              {valid
                ? `Hasta ${n} por fuente — unas ${n * SOURCES} normas en total. Mantenlo bajo (5) para la demo.`
                : `Escribe un número entre ${MIN} y ${MAX}.`}
            </p>
          </div>
          <Button onClick={onUpdate} disabled={pending || !valid || ingesting} className="w-full">
            {ingesting ? "En progreso…" : pending && action === "update" ? "Iniciando…" : "Ejecutar ingesta"}
          </Button>

          {progress && (
            <div className="space-y-1" role="status" aria-live="polite">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ease-out ${
                    progress.phase === "error" ? "bg-destructive" : "bg-primary"
                  }`}
                  style={{ width: `${Math.round(overallPct(progress))}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{progressLabel(progress)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual notification</CardTitle>
          <CardDescription>Cruza las normas contra los perfiles y despacha las alertas nuevas.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col justify-end h-[calc(100%-5rem)]">
          <Button onClick={onNotify} disabled={pending} variant="secondary" className="w-full">
            {pending && action === "notify" ? "Iniciando…" : "Ejecutar notificación"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
