import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * The `state` that travels to GitHub and comes back in the install callback.
 *
 * It's signed because GitHub returns it to us as-is: without a signature, anyone could
 * call the callback with someone else's companyId and point their installation at another
 * company. The signature doesn't replace session verification (once auth exists it must be
 * added), but it does prevent forging a state for a company that isn't yours.
 */
const secret = () => {
  const s = process.env.GITHUB_STATE_SECRET
  if (!s) throw new Error('missing GITHUB_STATE_SECRET')
  return s
}

const sign = (companyId: string) => createHmac('sha256', secret()).update(companyId).digest('base64url')

export function signState(companyId: string): string {
  return `${companyId}.${sign(companyId)}`
}

/** companyId if the signature is valid, null if the state was tampered with or missing. */
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

/** URL to send the user to so they install the GitHub App on their repos. */
export function buildInstallUrl(companyId: string): string {
  const slug = process.env.GITHUB_APP_SLUG ?? 'complia-app'
  return `https://github.com/apps/${slug}/installations/new?state=${encodeURIComponent(signState(companyId))}`
}
