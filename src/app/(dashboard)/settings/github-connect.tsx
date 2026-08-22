"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ReposState =
  | { connected: false; installUrl: string }
  | {
      connected: true;
      selected: string | null;
      repos: { fullName: string; private: boolean }[];
      manageUrl: string;
    };

/** `children` = campos del tier PRO que solo tienen sentido con un repo conectado
 *  (hoy, el revisor). Van aquí para no partir la configuración en dos tarjetas,
 *  pero los guarda el submit del formulario que los pasa. */
type Props = { companyId: string; children?: React.ReactNode };

export function GithubConnect({ companyId, children }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, setState] = useState<ReposState | null>(null);
  const [loading, setLoading] = useState(true);
  const [choosing, setChoosing] = useState(false);
  const [pickedRepo, setPickedRepo] = useState("");
  const [saving, setSaving] = useState(false);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  // Al terminar de generar se abre el diálogo: ahí se decide si además se abre el PR.
  const [reviewOpen, setReviewOpen] = useState(false);
  const [wantPr, setWantPr] = useState(true);
  const [creatingPr, setCreatingPr] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pro/repos?companyId=${companyId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo consultar GitHub");
      setState(data);
      if (data.connected && data.selected) setPickedRepo(data.selected);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al consultar GitHub");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount: no hay librería de data fetching instalada
    load();
  }, [load]);

  // El callback de instalación vuelve a /settings con ?github=ok|error.
  useEffect(() => {
    const status = searchParams.get("github");
    if (!status) return;
    if (status === "ok") {
      toast.success("GitHub conectado. Elige el repositorio a monitorear.");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- refresca tras volver del callback de instalación
      load();
    } else if (status === "error") {
      toast.error("No se pudo conectar GitHub. Intenta de nuevo.");
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("github");
    url.searchParams.delete("installation_id");
    router.replace(`${url.pathname}${url.search}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSaveRepo = async () => {
    if (!pickedRepo) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pro/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, repo: pickedRepo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar el repositorio");
      toast.success(`Repositorio ${pickedRepo} conectado`);
      setChoosing(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar el repositorio");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateComplia = async () => {
    setGenerating(true);
    setMarkdown(null);
    try {
      const res = await fetch("/api/pro/complia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo generar COMPLIA.md");
      setMarkdown(data.markdown);
      setReviewOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al generar COMPLIA.md");
    } finally {
      setGenerating(false);
    }
  };

  /** Cierra el diálogo. Si se pidió el PR, lo abre antes; si no, el markdown queda
   *  abajo para copiarlo a mano. */
  const handleConfirmComplia = async () => {
    if (!wantPr || !markdown) {
      setReviewOpen(false);
      return;
    }
    setCreatingPr(true);
    try {
      const res = await fetch("/api/pro/complia/pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, markdown }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo abrir el PR");
      setReviewOpen(false);
      toast.success("PR abierto en draft", {
        action: { label: "Ver PR", onClick: () => window.open(data.prUrl, "_blank") },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al abrir el PR");
    } finally {
      setCreatingPr(false);
    }
  };

  const handleCopy = async () => {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
    toast.success("Copiado al portapapeles");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conectar GitHub</CardTitle>
        <CardDescription>
          Conecta el repositorio de tu empresa para que complAI proponga PRs de
          cumplimiento cuando aplique una norma.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <p className="text-sm text-muted-foreground">Consultando conexión…</p>
        )}

        {!loading && state && !state.connected && (
          <Button nativeButton={false} render={<a href={state.installUrl} />}>
            Conectar GitHub
          </Button>
        )}

        {!loading && state && state.connected && (!state.selected || choosing) && (
          <div className="space-y-3">
            <Label htmlFor="repo-select">Elige el repositorio</Label>
            {state.repos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                La instalación no tiene acceso a ningún repositorio. Usa &quot;Gestionar
                en GitHub&quot; para darle acceso a uno.
              </p>
            ) : (
              <Select value={pickedRepo} onValueChange={(value) => setPickedRepo(value ?? "")}>
                <SelectTrigger id="repo-select" className="w-full">
                  <SelectValue placeholder="Selecciona un repositorio…" />
                </SelectTrigger>
                <SelectContent>
                  {state.repos.map((r) => (
                    <SelectItem key={r.fullName} value={r.fullName}>
                      {r.fullName}
                      {r.private ? " (privado)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex gap-2">
              <Button onClick={handleSaveRepo} disabled={!pickedRepo || saving}>
                {saving ? "Guardando…" : "Guardar repositorio"}
              </Button>
              {state.selected && (
                <Button variant="outline" onClick={() => setChoosing(false)}>
                  Cancelar
                </Button>
              )}
              <Button variant="ghost" nativeButton={false} render={<a href={state.manageUrl} />}>
                Gestionar en GitHub
              </Button>
            </div>
          </div>
        )}

        {!loading && state && state.connected && state.selected && !choosing && (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Repositorio conectado</p>
              <p className="font-medium">{state.selected}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setChoosing(true)}>
                Cambiar repo
              </Button>
              <Button variant="outline" nativeButton={false} render={<a href={state.manageUrl} />}>
                Gestionar en GitHub
              </Button>
              <Button
                variant="secondary"
                onClick={handleGenerateComplia}
                disabled={generating}
              >
                {generating ? "Generando…" : "Generar COMPLIA.md"}
              </Button>
            </div>
            {children}
          </div>
        )}

        {markdown && (
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>COMPLIA.md propuesto</Label>
              <Button size="sm" variant="ghost" onClick={handleCopy}>
                Copiar
              </Button>
            </div>
            <pre className="max-h-80 overflow-auto rounded-md border bg-muted p-3 text-xs whitespace-pre-wrap">
              {markdown}
            </pre>
            <p className="text-xs text-muted-foreground">
              Copia este contenido en un archivo <code>COMPLIA.md</code> en la raíz de tu
              repositorio para que el agente sepa qué archivos importan.
            </p>
          </div>
        )}

        <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>COMPLIA.md propuesto</DialogTitle>
              <DialogDescription>
                Este archivo le dice al agente qué partes de tu repositorio importan cuando
                cambia la normativa. Revísalo antes de continuar.
              </DialogDescription>
            </DialogHeader>

            <pre className="max-h-72 overflow-auto rounded-md border bg-muted p-3 text-xs whitespace-pre-wrap">
              {markdown}
            </pre>

            <div className="flex items-start gap-3 rounded-md border p-3">
              <Checkbox
                id="want-pr"
                checked={wantPr}
                onCheckedChange={(checked) => setWantPr(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="want-pr" className="font-medium">
                  Abrir un PR con este archivo
                </Label>
                <p className="text-sm text-muted-foreground">
                  {state && state.connected && state.selected
                    ? `Se abre en draft sobre ${state.selected}, con el revisor asignado. Si lo dejas sin marcar, el contenido queda abajo para copiarlo a mano.`
                    : "Necesitas un repositorio conectado para abrir el PR."}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={creatingPr}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmComplia} disabled={creatingPr}>
                {creatingPr ? "Abriendo PR…" : wantPr ? "Abrir PR" : "Listo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
