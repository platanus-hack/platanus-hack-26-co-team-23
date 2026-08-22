/**
 * Public base URL of the app, for links that travel outside the browser
 * (a WhatsApp message, an email, the PDF guide in a Slack post).
 *
 * NEXT_PUBLIC_APP_URL wins so a custom domain can be pinned; otherwise Vercel's
 * production URL, and localhost as the last resort for local runs.
 */
export function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL
  if (explicit) return explicit.replace(/\/$/, '')
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL
  return vercel ? `https://${vercel}` : 'http://localhost:3000'
}

/** Public link to an alert's PDF guide. */
export const guideUrl = (alertId: string) => `${appUrl()}/api/alerts/${alertId}/guia`
