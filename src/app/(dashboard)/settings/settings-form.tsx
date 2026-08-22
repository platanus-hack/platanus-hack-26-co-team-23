"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Company, CHANNEL_TYPES, COMPANY_TYPES, SECTORS } from "@/lib/types";
import { updateCompanySettings } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

type ChannelState = {
  type: string;
  enabled: boolean;
  config: Record<string, string>;
  min_severity?: string;
};

type SettingsFormProps = {
  company: Company | null;
  isAdmin: boolean;
};

export function SettingsForm({ company, isAdmin }: SettingsFormProps) {
  const [name, setName] = useState(company?.name || "");
  const [companyType, setCompanyType] = useState(company?.company_type || "");
  const [sectors, setSectors] = useState<string[]>(company?.sectors || []);
  const [channels, setChannels] = useState<ChannelState[]>(() => {
    if (!company) {
      return CHANNEL_TYPES.map((type) => ({
        type,
        enabled: false,
        config: getDefaultConfig(type),
        min_severity: type === "voice" ? "high" : undefined,
      }));
    }

    return CHANNEL_TYPES.map((type) => {
      const existing = company.channels.find((ch) => ch.type === type);
      return {
        type,
        enabled: !!existing,
        config: existing?.config || getDefaultConfig(type),
        min_severity: existing?.min_severity || (type === "voice" ? "high" : undefined),
      };
    });
  });
  const [githubRepo, setGithubRepo] = useState(company?.github_repo || "");
  const [reviewerGithub, setReviewerGithub] = useState(company?.reviewer_github || "");
  const [loading, setLoading] = useState(false);

  const handleSectorToggle = (sector: string) => {
    setSectors((prev) =>
      prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector],
    );
  };

  const handleChannelChange = (index: number, field: string, value: string | boolean | undefined) => {
    setChannels((prev) => {
      const updated = [...prev];
      if (field === "enabled") {
        updated[index].enabled = value as boolean;
      } else if (field === "min_severity") {
        updated[index].min_severity = value as string | undefined;
      } else {
        updated[index].config[field] = String(value);
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !companyType) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    setLoading(true);
    try {
      const result = await updateCompanySettings({
        name,
        company_type: companyType,
        sectors,
        channels: channels.map((ch) => ({
          type: ch.type,
          enabled: ch.enabled,
          config: ch.config,
          min_severity: ch.min_severity,
        })),
        github_repo: githubRepo || null,
        reviewer_github: reviewerGithub || null,
      });

      if (result?.success) {
        toast.success("Configuración guardada exitosamente");
      } else if (result?.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al guardar la configuración");
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return <ReadOnlyView company={company} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Perfil de empresa</CardTitle>
          <CardDescription>
            Información básica sobre tu empresa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la empresa</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mi Empresa S.A.S."
              required
            />
          </div>

          {/* Company Type */}
          <div className="space-y-3">
            <Label>Tipo de sociedad</Label>
            <div className="flex flex-wrap gap-2">
              {COMPANY_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCompanyType(type)}
                  className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                    companyType === type
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Sectors */}
          <div className="space-y-3">
            <Label>Sectores</Label>
            <div className="flex flex-wrap gap-2">
              {SECTORS.map((sector) => (
                <button
                  key={sector}
                  type="button"
                  onClick={() => handleSectorToggle(sector)}
                  className="transition-all"
                >
                  <Badge
                    variant={sectors.includes(sector) ? "default" : "outline"}
                    className="cursor-pointer"
                  >
                    {sector}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Channels Section */}
      <Card>
        <CardHeader>
          <CardTitle>Canales de notificación</CardTitle>
          <CardDescription>
            Configura dónde quieres recibir alertas de compliance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {channels.map((channel, index) => (
            <div key={channel.type} className="space-y-4 pb-6 last:pb-0 last:border-0 border-b">
              <div className="flex items-center justify-between">
                <Label className="capitalize font-semibold">{channel.type}</Label>
                <Switch
                  checked={channel.enabled}
                  onCheckedChange={(checked) =>
                    handleChannelChange(index, "enabled", checked)
                  }
                />
              </div>

              {channel.enabled && (
                <>
                  {/* Channel Config Input */}
                  <div className="space-y-2">
                    <Label htmlFor={`config-${channel.type}`} className="text-sm">
                      {getConfigLabel(channel.type)}
                    </Label>
                    <Input
                      id={`config-${channel.type}`}
                      value={
                        channel.config[getConfigField(channel.type)] || ""
                      }
                      onChange={(e) =>
                        handleChannelChange(
                          index,
                          getConfigField(channel.type),
                          e.target.value,
                        )
                      }
                      placeholder={getConfigPlaceholder(channel.type)}
                    />
                  </div>

                  {/* Min Severity - Not for voice */}
                  {channel.type !== "voice" && (
                    <div className="space-y-2">
                      <Label className="text-sm">Severidad mínima</Label>
                      <div className="flex flex-wrap gap-2">
                        {["", "low", "medium", "high"].map((sev) => (
                          <button
                            key={sev}
                            type="button"
                            onClick={() =>
                              handleChannelChange(
                                index,
                                "min_severity",
                                sev || undefined,
                              )
                            }
                            className={`px-3 py-1 rounded border text-sm transition-all ${
                              channel.min_severity === (sev || undefined)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border bg-background hover:border-primary/50"
                            }`}
                          >
                            {sev === "" ? "Todo" : sev === "low" ? "Baja+" : sev === "medium" ? "Media+" : "Solo Alta"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* PRO Section */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración PRO</CardTitle>
          <CardDescription>
            Configura tu repositorio de GitHub para análisis de compliance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="github-repo">Repositorio GitHub</Label>
            <Input
              id="github-repo"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="owner/repo"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reviewer-github">Revisor GitHub</Label>
            <Input
              id="reviewer-github"
              value={reviewerGithub}
              onChange={(e) => setReviewerGithub(e.target.value)}
              placeholder="username"
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={loading} size="lg">
          {loading ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

// Read-only view for non-admins
function ReadOnlyView({ company }: { company: Company | null }) {
  if (!company) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">
            Tu organización aún no ha configurado CumplIA.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Perfil de empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Nombre</p>
            <p className="font-medium">{company.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tipo de sociedad</p>
            <p className="font-medium">{company.company_type}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Sectores</p>
            <div className="flex flex-wrap gap-2">
              {company.sectors.map((sector) => (
                <Badge key={sector}>{sector}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Canales de notificación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {company.channels.length === 0 ? (
            <p className="text-muted-foreground">No hay canales configurados.</p>
          ) : (
            company.channels.map((channel) => (
              <div key={channel.type} className="pb-4 border-b last:border-0 last:pb-0">
                <p className="font-medium capitalize mb-1">{channel.type}</p>
                <p className="text-sm text-muted-foreground">
                  {channel.config[getConfigField(channel.type)] || "Configuración no disponible"}
                </p>
                {channel.min_severity && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    Min: {channel.min_severity}
                  </Badge>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* PRO Section */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración PRO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Repositorio GitHub</p>
            <p className="font-medium">{company.github_repo || "No configurado"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Revisor GitHub</p>
            <p className="font-medium">{company.reviewer_github || "No configurado"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions
function getConfigField(channelType: string): string {
  const map: Record<string, string> = {
    slack: "webhook_url",
    google_chat: "webhook_url",
    discord: "webhook_url",
    teams: "webhook_url",
    email: "address",
    whatsapp: "phone",
    voice: "phone",
  };
  return map[channelType] || "webhook_url";
}

function getConfigLabel(channelType: string): string {
  const map: Record<string, string> = {
    slack: "Webhook URL",
    google_chat: "Webhook URL",
    discord: "Webhook URL",
    teams: "Webhook URL",
    email: "Correo electrónico",
    whatsapp: "Número de teléfono",
    voice: "Número de teléfono",
  };
  return map[channelType] || "Configuración";
}

function getConfigPlaceholder(channelType: string): string {
  const map: Record<string, string> = {
    slack: "https://hooks.slack.com/...",
    google_chat: "https://chat.googleapis.com/...",
    discord: "https://discord.com/api/webhooks/...",
    teams: "https://outlook.webhook.office.com/...",
    email: "alerts@example.com",
    whatsapp: "+57 300 123 4567",
    voice: "+57 300 123 4567",
  };
  return map[channelType] || "Configuración";
}

function getDefaultConfig(channelType: string): Record<string, string> {
  const field = getConfigField(channelType);
  return { [field]: "" };
}
