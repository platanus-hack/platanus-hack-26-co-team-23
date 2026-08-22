"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ChannelConfig, COMPANY_TYPES, SECTORS, CHANNEL_TYPES } from "@/lib/types";

type SettingsFormData = {
  name: string;
  company_type: string;
  sectors: string[];
  channels: Array<{
    type: string;
    enabled: boolean;
    config: Record<string, string>;
    min_severity?: string;
  }>;
  reviewer_github: string | null;
};

export async function updateCompanySettings(data: SettingsFormData) {
  try {
    const { userId, orgId, orgRole } = await auth();

    if (!userId || !orgId) {
      return { error: "No autorizado" };
    }

    if (orgRole !== "org:admin") {
      return { error: "Solo administradores pueden cambiar estas configuraciones" };
    }

    // Validate input
    if (!data.name || !data.company_type) {
      return { error: "Nombre y tipo de sociedad son requeridos" };
    }

    if (!COMPANY_TYPES.includes(data.company_type as typeof COMPANY_TYPES[number])) {
      return { error: "Tipo de sociedad inválido" };
    }

    // Validate sectors
    const validSectors = data.sectors.filter((s) => SECTORS.includes(s as typeof SECTORS[number]));

    // Build channels array
    const channels: ChannelConfig[] = data.channels
      .filter((ch) => ch.enabled && ch.config && Object.values(ch.config).some((v) => v))
      .map((ch) => {
        const channelConfig: ChannelConfig = {
          type: ch.type as typeof CHANNEL_TYPES[number],
          config: ch.config,
        };

        // Set min_severity, but force 'high' for voice
        if (ch.type === "voice") {
          channelConfig.min_severity = "high";
        } else if (ch.min_severity && ["low", "medium", "high"].includes(ch.min_severity)) {
          channelConfig.min_severity = ch.min_severity as "low" | "medium" | "high";
        }

        return channelConfig;
      });

    const admin = supabaseAdmin();

    // Upsert company
    const { data: company, error: updateError } = await admin
      .from("companies")
      .upsert(
        {
          clerk_org_id: orgId,
          clerk_user_id: userId,
          name: data.name,
          company_type: data.company_type,
          sectors: validSectors,
          channels: channels,
          reviewer_github: data.reviewer_github || null,
        },
        { onConflict: "clerk_org_id" },
      )
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return { error: "Error al guardar la configuración" };
    }

    return { success: true, data: company };
  } catch (error) {
    console.error("Error in updateCompanySettings:", error);
    return { error: "Error inesperado al guardar la configuración" };
  }
}
