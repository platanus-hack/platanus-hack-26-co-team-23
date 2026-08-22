import { auth } from '@clerk/nextjs/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Access control for the API routes.
 *
 * The dashboard routes resolve the company from the Clerk session, never from the
 * request: taking `companyId` from the caller meant anyone could read another
 * company's compliance findings or point its PRs at a different repo.
 */

/** The caller's company, or null when there's no session or no company yet. */
export async function callerCompany(): Promise<{ id: string } | null> {
  const { orgId } = await auth()
  if (!orgId) return null
  const { data } = await supabaseAdmin()
    .from('companies')
    .select('id')
    .eq('clerk_org_id', orgId)
    .single()
  return data ?? null
}

/** True when the alert belongs to the caller's company. */
export async function callerOwnsAlert(alertId: string): Promise<boolean> {
  const company = await callerCompany()
  if (!company) return false
  const { data } = await supabaseAdmin()
    .from('alerts')
    .select('id')
    .eq('id', alertId)
    .eq('company_id', company.id)
    .single()
  return !!data
}

/**
 * Signed links for what has to work outside the browser: the PDF guide travels in a
 * WhatsApp message and an email, so it can't require a login — but it can't be
 * guessable either.
 */
const secret = () => {
  const s = process.env.CRON_SECRET
  if (!s) throw new Error('falta CRON_SECRET')
  return s
}

export const signLink = (purpose: string, id: string): string =>
  createHmac('sha256', secret()).update(`${purpose}:${id}`).digest('base64url')

export function verifyLink(purpose: string, id: string, sig: string | null): boolean {
  if (!sig) return false
  const given = Buffer.from(sig)
  const expected = Buffer.from(signLink(purpose, id))
  return given.length === expected.length && timingSafeEqual(given, expected)
}
