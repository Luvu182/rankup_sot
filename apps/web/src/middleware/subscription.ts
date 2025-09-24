import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@Rankup-manager/backend/convex/_generated/api";
import { 
  SUBSCRIPTION_FEATURES, 
  SUBSCRIPTION_ERRORS,
  CACHE_KEYS,
  CACHE_TTL 
} from "@Rankup-manager/shared";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Check if user has a specific feature based on their subscription
 */
export async function hasFeature(feature: string): Promise<boolean> {
  const { has } = await auth();
  return has({ permission: feature });
}

/**
 * Require a specific feature, throw error if not available
 */
export async function requireFeature(feature: string) {
  if (!await hasFeature(feature)) {
    throw new Error(SUBSCRIPTION_ERRORS.FEATURE_LOCKED);
  }
}

/**
 * Get user's project limit based on subscription
 */
export async function getProjectLimit(): Promise<number> {
  const { has } = await auth();
  
  if (await has({ permission: SUBSCRIPTION_FEATURES.UNLIMITED_PROJECTS })) {
    return -1; // Unlimited
  }
  if (await has({ permission: SUBSCRIPTION_FEATURES.PROJECTS_20 })) {
    return 20;
  }
  if (await has({ permission: SUBSCRIPTION_FEATURES.PROJECTS_5 })) {
    return 5;
  }
  
  return 1; // Free tier default
}

/**
 * Get keyword limit per project based on subscription
 */
export async function getKeywordLimit(): Promise<number> {
  const { has } = await auth();
  
  if (await has({ permission: SUBSCRIPTION_FEATURES.UNLIMITED_KEYWORDS })) {
    return -1; // Unlimited
  }
  if (await has({ permission: SUBSCRIPTION_FEATURES.KEYWORDS_2000 })) {
    return 2000;
  }
  if (await has({ permission: SUBSCRIPTION_FEATURES.KEYWORDS_500 })) {
    return 500;
  }
  
  return 100; // Free tier default
}

/**
 * Check if user can create more projects (with caching)
 */
export async function canCreateProject(): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
}> {
  const { userId, getToken } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const limit = await getProjectLimit();
  
  // Unlimited projects
  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1, remaining: -1 };
  }

  // Check cache first
  const cacheKey = CACHE_KEYS.PROJECT_COUNT(userId);
  let projectCount = await redis.get<number>(cacheKey);
  
  if (projectCount === null) {
    // Cache miss, query from Convex
    const token = await getToken({ template: "convex" });
    convex.setAuth(token || undefined);
    
    const projects = await convex.query(api.projects.getProjects);
    projectCount = projects.length;
    
    // Cache for 5 minutes
    await redis.setex(cacheKey, CACHE_TTL.PROJECT_COUNT, projectCount);
  }
  
  const remaining = Math.max(0, limit - projectCount);
  
  return {
    allowed: projectCount < limit,
    current: projectCount,
    limit,
    remaining
  };
}

/**
 * Check if project can add more keywords (with caching)
 */
export async function canAddKeywords(
  projectId: string,
  additionalCount: number = 1
): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
}> {
  const limit = await getKeywordLimit();
  
  // Unlimited keywords
  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1, remaining: -1 };
  }

  // Check cache first
  const cacheKey = CACHE_KEYS.KEYWORD_COUNT(projectId);
  let keywordCount = await redis.get<number>(cacheKey);
  
  if (keywordCount === null) {
    // Cache miss, query from BigQuery
    // This will be replaced with actual BigQuery query
    keywordCount = 0; // TODO: Implement BigQuery count
    
    // Cache for 1 minute
    await redis.setex(cacheKey, CACHE_TTL.KEYWORD_COUNT, keywordCount);
  }
  
  const remaining = Math.max(0, limit - keywordCount);
  
  return {
    allowed: (keywordCount + additionalCount) <= limit,
    current: keywordCount,
    limit,
    remaining
  };
}

/**
 * Increment project count cache
 */
export async function incrementProjectCount(userId: string) {
  const cacheKey = CACHE_KEYS.PROJECT_COUNT(userId);
  await redis.incr(cacheKey);
}

/**
 * Increment keyword count cache
 */
export async function incrementKeywordCount(projectId: string, count: number = 1) {
  const cacheKey = CACHE_KEYS.KEYWORD_COUNT(projectId);
  await redis.incrby(cacheKey, count);
}

/**
 * Clear user's cache (useful after subscription changes)
 */
export async function clearUserCache(userId: string) {
  const projectKey = CACHE_KEYS.PROJECT_COUNT(userId);
  const featuresKey = CACHE_KEYS.USER_FEATURES(userId);
  
  await redis.del(projectKey, featuresKey);
}

/**
 * Middleware to check subscription limits
 */
export async function withSubscriptionCheck(
  handler: Function,
  options?: {
    requireFeature?: string;
    checkProjectLimit?: boolean;
    checkKeywordLimit?: boolean;
    projectId?: string;
  }
) {
  return async (request: Request, ...args: any[]) => {
    try {
      // Check required feature
      if (options?.requireFeature) {
        await requireFeature(options.requireFeature);
      }
      
      // Check project limit
      if (options?.checkProjectLimit) {
        const projectCheck = await canCreateProject();
        if (!projectCheck.allowed) {
          return NextResponse.json({
            error: SUBSCRIPTION_ERRORS.PROJECT_LIMIT,
            limit: projectCheck.limit,
            current: projectCheck.current
          }, { status: 402 });
        }
      }
      
      // Check keyword limit
      if (options?.checkKeywordLimit && options?.projectId) {
        const keywordCheck = await canAddKeywords(options.projectId);
        if (!keywordCheck.allowed) {
          return NextResponse.json({
            error: SUBSCRIPTION_ERRORS.KEYWORD_LIMIT,
            limit: keywordCheck.limit,
            current: keywordCheck.current
          }, { status: 402 });
        }
      }
      
      // Call the actual handler
      return handler(request, ...args);
      
    } catch (error: any) {
      if (error.message === SUBSCRIPTION_ERRORS.FEATURE_LOCKED) {
        return NextResponse.json({
          error: error.message
        }, { status: 402 });
      }
      
      throw error;
    }
  };
}