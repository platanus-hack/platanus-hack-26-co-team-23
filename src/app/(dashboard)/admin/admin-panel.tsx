"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { runManualUpdate, runManualNotification } from "./actions";

export function AdminPanel() {
  const [maxNews, setMaxNews] = useState(5);
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<"update" | "notify" | null>(null);

  const onUpdate = () =>
    startTransition(async () => {
      setAction("update");
      const r = await runManualUpdate(maxNews);
      if (r.ok) {
        toast.success(`Ingesta lista: ${r.data.nuevas ?? 0} nuevas, ${r.data.analyzed ?? 0} analizadas`);
      } else {
        toast.error(`Error en la ingesta: ${r.error}`);
      }
      setAction(null);
    });

  const onNotify = () =>
    startTransition(async () => {
      setAction("notify");
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

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Manual update</CardTitle>
          <CardDescription>Trae normativa nueva de las fuentes y la analiza.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maxNews">Máx. noticias por fuente</Label>
            <Input
              id="maxNews"
              type="number"
              min={1}
              max={25}
              value={maxNews}
              onChange={(e) => setMaxNews(Number(e.target.value))}
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">Mantenlo bajo (ej. 5) para la demo.</p>
          </div>
          <Button onClick={onUpdate} disabled={pending} className="w-full">
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
