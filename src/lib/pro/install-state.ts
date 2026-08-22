import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * El `state` que viaja a GitHub y vuelve en el callback de instalación.
 *
 * Va firmado porque GitHub nos lo devuelve tal cual: sin firma, cualquiera podría
 * llamar al callback con el companyId ajeno y apuntar su instalación a otra empresa.
 * La firma no reemplaza la verificación de sesión (cuando exista auth hay que sumarla),
 * pero sí impide fabricar un state para una empresa que no eres.
 */
const secret = () => {
  const s = process.env.GITHUB_STATE_SECRET
  if (!s) throw new Error('falta GITHUB_STATE_SECRET')
  return s
}

const sign = (companyId: string) => createHmac('sha256', secret()).update(companyId).digest('base64url')

export function signState(companyId: string): string {
  return `${companyId}.${sign(companyId)}`
}

/** companyId si la firma es válida, null si el state fue manipulado o no viene. */
export function verifyState(state: string | null): string | null {
  if (!state) return null
  const i = state.lastIndexOf('.')
  if (i <= 0) return null
  const companyId = state.slice(0, i)
  const given = Buffer.from(state.slice(i + 1))
  const expected = Buffer.from(sign(companyId))
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  return companyId
}

/** URL a la que mandar al usuario para que instale la GitHub App en sus repos. */
export function buildInstallUrl(companyId: string): string {
  const slug = process.env.GITHUB_APP_SLUG ?? 'complia-app'
  return `https://github.com/apps/${slug}/installations/new?state=${encodeURIComponent(signState(companyId))}`
}
