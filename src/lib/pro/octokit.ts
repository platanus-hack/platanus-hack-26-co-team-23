import { App, Octokit } from 'octokit'

export type Gh = Octokit

/**
 * GitHub client for ONE company.
 *
 * - With `installationId`: the company installed the GitHub App on its repos and the
 *   token is requested on the fly (lasts 1h, scoped only to the repos it chose).
 * - Without it: falls back to the `GITHUB_TOKEN` PAT, which is demo mode — a single
 *   account that must be a collaborator on the repo. Doesn't work for multiple clients.
 */
export async function octokitFor(installationId: number | null): Promise<Gh> {
  if (installationId) {
    const appId = process.env.GITHUB_APP_ID
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY
    if (!appId || !privateKey)
      throw new Error('the company has the GitHub App installed but GITHUB_APP_ID/GITHUB_APP_PRIVATE_KEY are missing')
    // Vercel stores the PEM's line breaks escaped.
    const app = new App({ appId, privateKey: privateKey.replace(/\\n/g, '\n') })
    return app.getInstallationOctokit(installationId) as unknown as Gh
  }
  if (!process.env.GITHUB_TOKEN)
    throw new Error('company has no GitHub App installed and no fallback GITHUB_TOKEN')
  return new Octokit({ auth: process.env.GITHUB_TOKEN })
}
