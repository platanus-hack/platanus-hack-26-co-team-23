"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { runManualNotification } from "./actions";
import { sanitizeCount, isValidCount, clampCount, MIN, MAX, SOURCES } from "./count";
// Type-only: erased at compile time, so nothing from the server module reaches the client bundle.
import type { IngestProgress } from "@/lib/ingest/run";

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
  const abortRef = useRef<AbortController | null>(null);

  // Cancel the in-flight ingest stream if the admin navigates away mid-run.
  useEffect(() => () => abortRef.current?.abort(), []);

  const n = Number(maxNews);
  const valid = isValidCount(maxNews);
  const ingesting = progress != null && progress.phase !== "done" && progress.phase !== "error";

  // Streams the ingest from /api/admin/ingest (NDJSON, one progress line per step) and drives the
  // bar off it. The UI stays responsive — only this button locks — but closing the tab cancels it.
  const onUpdate = async () => {
    if (!valid || ingesting) return;
    // Optimistic first frame so the bar appears the instant the button is pressed.
    setProgress({ phase: "fetch", done: 0, total: SOURCES, source: "" });

    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch(`/api/admin/ingest?limit=${n}`, { signal: ac.signal });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          const p = JSON.parse(line) as IngestProgress;
          setProgress(p);
          if (p.phase === "done")
            toast.success("Ingesta completa", {
              description: `${p.nuevas} normas nuevas · ${p.analyzed} analizadas. Ya puedes pulsar 'Ejecutar notificación'.`,
            });
          if (p.phase === "error") toast.error(`Error en la ingesta: ${p.message}`);
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error(`No se pudo ejecutar la ingesta: ${(e as Error).message}`);
        setProgress(null);
      }
    }
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
              disabled={ingesting}
              aria-invalid={!valid}
            />
            <p className="text-xs text-muted-foreground">
              {valid
                ? `Hasta ${n} por fuente — unas ${n * SOURCES} normas en total. Mantenlo bajo (5) para la demo.`
                : `Escribe un número entre ${MIN} y ${MAX}.`}
            </p>
          </div>
          <Button onClick={onUpdate} disabled={!valid || ingesting} className="w-full">
            {ingesting ? "En progreso…" : "Ejecutar ingesta"}
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
