import { validateApiKey, unauthorized } from '@/lib/api-keys'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'

// Shared guard for public surfaces: rate limit (before auth, to stop
// key brute-forcing) + API key validation. A single place to maintain.
export function withApiGuard(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const rl = await rateLimit(req)
    if (!rl.ok) return tooManyRequests(rl.retryAfter)
    if (!(await validateApiKey(req))) return unauthorized()
    return fn(req)
  }
}
