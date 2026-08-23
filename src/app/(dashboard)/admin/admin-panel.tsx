"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { runManualUpdate, runManualNotification } from "./actions";
import { sanitizeCount, isValidCount, clampCount, MIN, MAX, SOURCES } from "./count";

export function AdminPanel() {
  // Kept as a string so the field can be emptied while typing — see ./count.ts.
  const [maxNews, setMaxNews] = useState("5");
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<"update" | "notify" | null>(null);

  const n = Number(maxNews);
  const valid = isValidCount(maxNews);

  const onUpdate = () => {
    if (!valid) return;
    setAction("update");
    startTransition(async () => {
      const r = await runManualUpdate(n);
      if (r.ok) {
        toast.success(`Ingesta lista: ${r.data.nuevas ?? 0} nuevas, ${r.data.analyzed ?? 0} analizadas`);
      } else {
        toast.error(`Error en la ingesta: ${r.error}`);
      }
      setAction(null);
    });
  };

  const onNotify = () => {
    setAction("notify");
    startTransition(async () => {
      const r = await runManualNotification();
      if (r.ok) {
        const ch = r.data.channels as Record<string, number> | undefined;
        const canales = ch && Object.keys(ch).length ? ` (${Object.entries(ch).map(([k, v]) => `${k}:${v}`).join(", ")})` : "";
        toast.success(`Notificación lista: ${r.data.alertsCreated ?? 0} alertas${canales}`);
      } else {
        toast.error(`Error en la notificación: ${r.error}`);
      }
      setAction(null);
    });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Manual update</CardTitle>
          <CardDescription>Trae normativa nueva de las fuentes y la analiza.</CardDescription>
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
          <Button onClick={onUpdate} disabled={pending || !valid} className="w-full">
            {pending && action === "update" ? "Actualizando…" : "Ejecutar ingesta"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual notification</CardTitle>
          <CardDescription>Cruza las normas contra los perfiles y despacha las alertas.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col justify-end h-[calc(100%-5rem)]">
          <Button onClick={onNotify} disabled={pending} variant="secondary" className="w-full">
            {pending && action === "notify" ? "Notificando…" : "Ejecutar notificación"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
