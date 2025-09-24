import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Cache key patterns
export const cacheKeys = {
  // Project stats
  projectStats: (projectId: string) => `stats:project:${projectId}`,
  
  // Latest rankings
  latestRankings: (projectId: string, page = 1) => 
    `rankings:latest:${projectId}:${page}`,
  
  // Keyword performance
  keywordPerformance: (keywordId: string) => 
    `keyword:perf:${keywordId}`,
  
  // Analytics data
  analytics: (projectId: string, metric: string, period: string) => 
    `analytics:${projectId}:${metric}:${period}`,
  
  // API rate limiting
  rateLimit: (userId: string, window: string) => 
    `rate:${userId}:${window}`,
  
  // BigQuery query results
  queryResult: (queryHash: string) => `query:${queryHash}`,
};

// TTL configurations (in seconds)
export const ttlConfig = {
  projectStats: 300,          // 5 minutes
  latestRankings: 600,        // 10 minutes
  keywordPerformance: 1800,   // 30 minutes
  analytics: 3600,            // 1 hour
  rateLimit: 3600,            // 1 hour
  queryResult: 7200,          // 2 hours
};

// Cache service
export class CacheService {
  /**
   * Get or set cache with automatic JSON handling
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    try {
      // Try to get from cache
      const cached = await redis.get<T>(key);
      if (cached !== null) {
        console.log(`Cache hit: ${key}`);
        return cached;
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }

    // Fetch from source
    console.log(`Cache miss: ${key}`);
    const data = await fetcher();

    // Set in cache (non-blocking)
    redis.setex(key, ttl, data).catch(error => {
      console.error('Cache write error:', error);
    });

    return data;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      // Note: Upstash doesn't support KEYS command in REST API
      // For now, we'll track keys manually or invalidate specific keys
      console.log(`Cache invalidation requested for pattern: ${pattern}`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Rate limiting check
   */
  async checkRateLimit(
    userId: string,
    limit: number,
    window: number // in seconds
  ): Promise<{ allowed: boolean; remaining: number }> {
    const key = cacheKeys.rateLimit(userId, `${window}s`);
    
    try {
      const current = await redis.incr(key);
      
      // Set expiry on first request
      if (current === 1) {
        await redis.expire(key, window);
      }
      
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Allow on error
      return { allowed: true, remaining: limit };
    }
  }
}

// Export singleton instance
export const cache = new CacheService();

// Example usage in BigQuery queries
export async function getCachedBigQueryResult<T>(
  query: string,
  params: any,
  fetcher: () => Promise<T>
): Promise<T> {
  // Create cache key from query + params
  const queryHash = Buffer.from(query + JSON.stringify(params))
    .toString('base64')
    .substring(0, 32);
  
  const cacheKey = cacheKeys.queryResult(queryHash);
  
  return cache.getOrSet(
    cacheKey,
    fetcher,
    ttlConfig.queryResult
  );
}