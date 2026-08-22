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

type Props = { companyId: string };

export function GithubConnect({ companyId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, setState] = useState<ReposState | null>(null);
  const [loading, setLoading] = useState(true);
  const [choosing, setChoosing] = useState(false);
  const [pickedRepo, setPickedRepo] = useState("");
  const [saving, setSaving] = useState(false);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al generar COMPLIA.md");
    } finally {
      setGenerating(false);
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
      </CardContent>
    </Card>
  );
}
