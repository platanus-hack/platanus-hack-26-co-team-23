import { createHash, randomBytes } from "node:crypto";

export interface ApiKeyGenerated {
  raw: string;
  prefix: string;
  hash: string;
}

/**
 * Genera una nueva API key con formato "cai_" + 24 bytes aleatorios en hex.
 * Devuelve la key cruda, el prefijo visible (primeros 10 chars) y el hash SHA-256.
 * La key cruda nunca se persiste — solo el hash se guarda en BD.
 */
export function generateApiKey(): ApiKeyGenerated {
  const raw = "cai_" + randomBytes(24).toString("hex");
  const prefix = raw.slice(0, 10);
  const hash = hashApiKey(raw);
  return { raw, prefix, hash };
}

/**
 * Genera el hash SHA-256 hex de una API key.
 * Usa esta función para validar keys contra `key_hash` en BD.
 */
export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Valida una API key contra su hash.
 */
export function validateApiKey(raw: string, hash: string): boolean {
  return hashApiKey(raw) === hash;
}
