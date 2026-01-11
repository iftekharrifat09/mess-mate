/**
 * API Cache - In-memory caching layer for API responses
 * Reduces redundant API calls and improves performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  
  // Default TTL: 30 seconds for most data
  private defaultTTL = 30000;
  
  // Shorter TTL for frequently changing data
  private shortTTL = 10000;
  
  // Longer TTL for rarely changing data
  private longTTL = 60000;

  /**
   * Get cached data if still valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Set cache entry with optional custom TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + (ttl || this.defaultTTL),
    });
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all entries matching a prefix
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Deduplicate concurrent requests to the same endpoint
   * Returns existing promise if request is already in flight
   */
  async dedupeRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if request is already in flight
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending;
    }

    // Make the request
    const promise = fetcher()
      .then((data) => {
        this.set(key, data);
        return data;
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Get TTL values for different data types
   */
  getTTL(type: 'short' | 'default' | 'long'): number {
    switch (type) {
      case 'short': return this.shortTTL;
      case 'long': return this.longTTL;
      default: return this.defaultTTL;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const apiCache = new APICache();

// Cache key generators
export const cacheKeys = {
  mess: (id: string) => `mess:${id}`,
  messMembers: (messId: string) => `mess:${messId}:members`,
  activeMonth: (messId: string) => `month:active:${messId}`,
  months: (messId: string) => `months:${messId}`,
  meals: (monthId: string) => `meals:${monthId}`,
  deposits: (monthId: string) => `deposits:${monthId}`,
  mealCosts: (monthId: string) => `mealCosts:${monthId}`,
  otherCosts: (monthId: string) => `otherCosts:${monthId}`,
  bazarDates: (messId: string) => `bazarDates:${messId}`,
  notices: (messId: string) => `notices:${messId}`,
  notifications: (userId: string) => `notifications:${userId}`,
  notes: (messId: string) => `notes:${messId}`,
  joinRequests: (messId: string) => `joinRequests:${messId}`,
  user: (id: string) => `user:${id}`,
  monthSummary: (monthId: string) => `summary:month:${monthId}`,
  memberSummary: (userId: string, monthId: string) => `summary:member:${userId}:${monthId}`,
  allMembersSummary: (monthId: string) => `summary:members:${monthId}`,
};

// Invalidation helpers
export const invalidateMessData = (messId: string) => {
  apiCache.invalidatePrefix(`mess:${messId}`);
  apiCache.invalidatePrefix(`month:`);
  apiCache.invalidatePrefix(`summary:`);
};

export const invalidateMonthData = (monthId: string) => {
  apiCache.invalidate(cacheKeys.meals(monthId));
  apiCache.invalidate(cacheKeys.deposits(monthId));
  apiCache.invalidate(cacheKeys.mealCosts(monthId));
  apiCache.invalidate(cacheKeys.otherCosts(monthId));
  apiCache.invalidatePrefix(`summary:`);
};
