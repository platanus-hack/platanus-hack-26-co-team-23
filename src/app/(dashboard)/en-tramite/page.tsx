import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sourceLine } from "@/lib/sources";
import type { Norm, VoteChoice, VoteTally } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VoteButtons } from "./vote-buttons";

export default async function EnTramitePage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect("/sign-in");

  const db = supabaseAdmin();

  // Proposed bills, freshest first. We don't require analysis: a bill still shows even before the
  // LLM has summarized it, so the section is never empty right after an ingest.
  const { data: normsData } = await db
    .from("norms")
    .select("*")
    .eq("status", "en_tramite")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(50);
  const norms = (normsData ?? []) as Norm[];

  // One query for every vote this org cast on any of these bills → build each tally in memory.
  const tallies = new Map<string, VoteTally>();
  if (norms.length) {
    const { data: votes } = await db
      .from("norm_votes")
      .select("norm_id, vote, clerk_user_id")
      .eq("clerk_org_id", orgId)
      .in("norm_id", norms.map((n) => n.id));
    for (const n of norms) tallies.set(n.id, { favor: 0, contra: 0, mine: null });
    for (const v of votes ?? []) {
      const t = tallies.get(v.norm_id);
      if (!t) continue;
      if (v.vote === "favor") t.favor++;
      else if (v.vote === "contra") t.contra++;
      if (v.clerk_user_id === userId) t.mine = v.vote as VoteChoice;
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">En trámite</h1>
        <p className="text-muted-foreground">
          Proyectos de ley que <strong>aún no son ley</strong>. Adelántate: revísalos y deja la
          postura de tu equipo (a favor / en contra).
        </p>
      </div>

      {norms.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              Todavía no hay proyectos de ley cargados. Corre una ingesta desde el panel de
              administración para traerlos del Congreso.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {norms.map((norm) => {
            const tally = tallies.get(norm.id) ?? { favor: 0, contra: 0, mine: null };
            return (
              <Card key={norm.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{norm.title || "Proyecto sin título"}</CardTitle>
                      <CardDescription className="mt-1">
                        Fuente:{" "}
                        <span className="text-foreground font-medium">
                          {sourceLine(norm.issuer, norm.source)}
                        </span>
                        {norm.published_at && <> · Presentado el {norm.published_at}</>}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">En trámite</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {norm.summary && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Resumen</p>
                      <p className="text-sm">{norm.summary}</p>
                    </div>
                  )}
                  {norm.sectors?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {norm.sectors.map((s) => (
                        <Badge key={s} variant="outline">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground">
                      Postura de tu equipo · privada
                    </span>
                    <VoteButtons normId={norm.id} initial={tally} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
