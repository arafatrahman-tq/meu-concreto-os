/**
 * Simple in-memory rate limiter.
 *
 * Suitable for single-instance deployments (Coolify, Docker, etc.).
 * For multi-instance or edge deployments, replace the Map with a
 * shared KV store (Redis, Upstash, etc.).
 *
 * Default policy: 10 attempts per 15-minute window per key.
 * Successful login should call clearRateLimit() to reset the counter.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_ATTEMPTS = 10

// Store is module-level — survives request lifecycle but reset on server restart.
const store = new Map<string, RateLimitEntry>()

// Prune stale entries every 30 minutes to avoid unbounded memory growth.
setInterval(
  () => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (entry.resetAt < now) store.delete(key)
    }
  },
  30 * 60 * 1000
)

/**
 * Check whether the given key has exceeded the rate limit.
 * Throws HTTP 429 if the limit is hit.
 */
export function checkRateLimit(key: string): void {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    // First attempt in this window (or window expired) — reset
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }

  entry.count++

  if (entry.count > MAX_ATTEMPTS) {
    const retryAfterSecs = Math.ceil((entry.resetAt - now) / 1000)
    throw createError({
      statusCode: 429,
      message: `Muitas tentativas. Tente novamente em ${retryAfterSecs} segundos.`,
      data: { retryAfter: retryAfterSecs }
    })
  }
}

/**
 * Reset the counter for a key — call this after a successful login.
 */
export function clearRateLimit(key: string): void {
  store.delete(key)
}
