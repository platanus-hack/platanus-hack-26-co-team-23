"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateApiKey } from "@/lib/api-keys";
import { revalidatePath } from "next/cache";

/**
 * Crea una nueva API key para la empresa de la organización activa.
 * Solo org:admin puede crear keys.
 */
export async function createKey(name: string) {
  const { userId, orgId, orgRole } = await auth();

  // Validar que es admin
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

    // Encontrar la empresa por clerk_org_id
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("clerk_org_id", orgId)
      .single();

    if (companyError || !company) {
      return { error: "No se encontró la empresa" };
    }

    // Generar la API key
    const { raw, prefix, hash } = generateApiKey();

    // Insertar en la tabla api_keys
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

    // Revalidar el path para que la lista se actualice
    revalidatePath("/keys");

    // Devolver solo la key cruda (una única vez)
    return { raw };
  } catch (error) {
    console.error("Error creating API key:", error);
    return { error: "Error al crear la API key" };
  }
}

/**
 * Revoca una API key existente.
 * Solo org:admin puede revocar keys, y solo de su propia empresa.
 */
export async function revokeKey(id: string) {
  const { orgId, orgRole } = await auth();

  // Validar que es admin
  if (orgRole !== "org:admin") {
    return { error: "Solo administradores pueden revocar API keys" };
  }

  if (!orgId) {
    return { error: "No se pudo obtener la información de la organización" };
  }

  try {
    const supabase = supabaseAdmin();

    // Encontrar la empresa
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("clerk_org_id", orgId)
      .single();

    if (companyError || !company) {
      return { error: "No se encontró la empresa" };
    }

    // Verificar que la key pertenece a esta empresa
    const { data: apiKey, error: keyError } = await supabase
      .from("api_keys")
      .select("id")
      .eq("id", id)
      .eq("company_id", company.id)
      .single();

    if (keyError || !apiKey) {
      return { error: "No se encontró la API key o no tienes permiso para revocarla" };
    }

    // Revocar la key
    const { error: revokeError } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);

    if (revokeError) {
      console.error("Error revoking API key:", revokeError);
      return { error: "Error al revocar la API key" };
    }

    // Revalidar el path
    revalidatePath("/keys");

    return { success: true };
  } catch (error) {
    console.error("Error revoking API key:", error);
    return { error: "Error al revocar la API key" };
  }
}
