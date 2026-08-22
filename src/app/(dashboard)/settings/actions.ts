"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { ChannelConfig, COMPANY_TYPES, SECTORS, CHANNEL_TYPES, ChannelType } from "@/lib/types";
import { CHANNEL_FIELD, normalizePhone, validateChannelValue } from "@/lib/channel-config";

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

    // Build channels array. An enabled channel with an empty or malformed value used
    // to be dropped silently here: the user saw "saved" and the alert never arrived.
    // Now it's a validation error.
    const enabled = data.channels.filter((ch) => ch.enabled)
    for (const ch of enabled) {
      if (!CHANNEL_TYPES.includes(ch.type as ChannelType))
        return { error: `Canal desconocido: ${ch.type}` };
      const field = CHANNEL_FIELD[ch.type as ChannelType];
      const problem = validateChannelValue(ch.type as ChannelType, ch.config?.[field] ?? "");
      if (problem) return { error: problem };
    }

    const channels: ChannelConfig[] = enabled
      .map((ch) => {
        const field = CHANNEL_FIELD[ch.type as ChannelType];
        const raw = ch.config[field].trim();
        const channelConfig: ChannelConfig = {
          type: ch.type as typeof CHANNEL_TYPES[number],
          // Store only the field the adapter reads, normalized.
          config: { [field]: field === "phone" ? normalizePhone(raw) : raw },
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

    // So the GitHub block appears right after the first save without a manual reload.
    revalidatePath("/settings");
    return { success: true, data: company };
  } catch (error) {
    console.error("Error in updateCompanySettings:", error);
    return { error: "Error inesperado al guardar la configuración" };
  }
}
