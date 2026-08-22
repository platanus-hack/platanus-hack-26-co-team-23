"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateApiKey } from "@/lib/api-keys";
import { revalidatePath } from "next/cache";

/**
 * Creates a new API key for the active organization's company.
 * Only org:admin can create keys.
 */
export async function createKey(name: string) {
  const { userId, orgId, orgRole } = await auth();

  // Validate that it's an admin
  if (orgRole !== "org:admin") {
    return { error: "Solo administradores pueden generar API keys" };
  }

  if (!orgId || !userId) {
    return { error: "No se pudo obtener la información de la organización" };
  }

  if (!name || name.trim().length === 0) {
    return { error: "El nombre de la API key es requerido" };
  }

  try {
    const supabase = supabaseAdmin();

    // Find the company by clerk_org_id
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("clerk_org_id", orgId)
      .single();

    if (companyError || !company) {
      return { error: "No se encontró la empresa" };
    }

    // Generate the API key
    const { raw, prefix, hash } = generateApiKey();

    // Insert into the api_keys table
    const { error: insertError } = await supabase
      .from("api_keys")
      .insert({
        company_id: company.id,
        clerk_user_id: userId,
        name: name.trim(),
        key_prefix: prefix,
        key_hash: hash,
      });

    if (insertError) {
      console.error("Error inserting API key:", insertError);
      return { error: "Error al guardar la API key" };
    }

    // Revalidate the path so the list refreshes
    revalidatePath("/keys");

    // Return only the raw key (a single time)
    return { raw };
  } catch (error) {
    console.error("Error creating API key:", error);
    return { error: "Error al crear la API key" };
  }
}

/**
 * Revokes an existing API key.
 * Only org:admin can revoke keys, and only for its own company.
 */
export async function revokeKey(id: string) {
  const { orgId, orgRole } = await auth();

  // Validate that it's an admin
  if (orgRole !== "org:admin") {
    return { error: "Solo administradores pueden revocar API keys" };
  }

  if (!orgId) {
    return { error: "No se pudo obtener la información de la organización" };
  }

  try {
    const supabase = supabaseAdmin();

    // Find the company
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("clerk_org_id", orgId)
      .single();

    if (companyError || !company) {
      return { error: "No se encontró la empresa" };
    }

    // Verify the key belongs to this company
    const { data: apiKey, error: keyError } = await supabase
      .from("api_keys")
      .select("id")
      .eq("id", id)
      .eq("company_id", company.id)
      .single();

    if (keyError || !apiKey) {
      return { error: "No se encontró la API key o no tienes permiso para revocarla" };
    }

    // Revoke the key
    const { error: revokeError } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);

    if (revokeError) {
      console.error("Error revoking API key:", revokeError);
      return { error: "Error al revocar la API key" };
    }

    // Revalidate the path
    revalidatePath("/keys");

    return { success: true };
  } catch (error) {
    console.error("Error revoking API key:", error);
    return { error: "Error al revocar la API key" };
  }
}
