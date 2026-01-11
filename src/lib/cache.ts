// Simple in-memory cache with TTL support
// In production, this can be replaced with Redis

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class InMemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Clean up expired entries every minute
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    })
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async deletePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace('*', '.*'))
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }
}

// Singleton instance
const globalForCache = globalThis as unknown as {
  cache: InMemoryCache | undefined
}

export const cache = globalForCache.cache ?? new InMemoryCache()

if (process.env.NODE_ENV !== 'production') {
  globalForCache.cache = cache
}

// Cache key generators
export const cacheKeys = {
  gameSearch: (query: string) => `game:search:${query.toLowerCase()}`,
  gameDetail: (id: string) => `game:detail:${id}`,
}

// TTL values in seconds
export const cacheTTL = {
  search: 5 * 60,        // 5 minutes for search results
  gameDetail: 24 * 60 * 60, // 24 hours for game details
}
