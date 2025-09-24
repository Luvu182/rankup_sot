/**
 * Subscription configuration using Clerk Billing
 * All subscription management is handled by Clerk Dashboard
 */

export enum SubscriptionTier {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

/**
 * Feature flags mapped to Clerk Billing features
 * These should match exactly with features configured in Clerk Dashboard
 */
export const SUBSCRIPTION_FEATURES = {
  // Project limits
  UNLIMITED_PROJECTS: 'unlimited_projects',
  PROJECTS_5: 'projects_5',
  PROJECTS_20: 'projects_20',
  
  // Keyword limits
  KEYWORDS_100: 'keywords_100',
  KEYWORDS_500: 'keywords_500', 
  KEYWORDS_2000: 'keywords_2000',
  UNLIMITED_KEYWORDS: 'unlimited_keywords',
  
  // Features
  API_ACCESS: 'api_access',
  COMPETITOR_TRACKING: 'competitor_tracking',
  CUSTOM_REPORTS: 'custom_reports',
  WHITE_LABEL: 'white_label',
  PRIORITY_SUPPORT: 'priority_support',
  
  // Data retention
  DATA_RETENTION_30: 'data_retention_30',
  DATA_RETENTION_90: 'data_retention_90',
  DATA_RETENTION_365: 'data_retention_365',
  DATA_RETENTION_UNLIMITED: 'data_retention_unlimited',
} as const;

/**
 * Plan configuration for UI display
 * Actual limits are enforced by Clerk Billing
 */
export const PLAN_CONFIG = {
  [SubscriptionTier.FREE]: {
    name: 'Free',
    description: 'Perfect for getting started',
    price: 0,
    features: [
      '1 project',
      '100 keywords',
      '30-day data retention',
      'Basic reports'
    ],
    highlighted: false
  },
  [SubscriptionTier.STARTER]: {
    name: 'Starter',
    description: 'For growing businesses',
    price: 29,
    features: [
      '5 projects',
      '500 keywords per project',
      '90-day data retention',
      'Competitor tracking',
      'Custom reports'
    ],
    highlighted: false
  },
  [SubscriptionTier.PRO]: {
    name: 'Pro',
    description: 'For serious SEO professionals',
    price: 99,
    features: [
      '20 projects',
      '2,000 keywords per project',
      '1-year data retention',
      'API access',
      'White-label reports',
      'Priority support'
    ],
    highlighted: true
  },
  [SubscriptionTier.ENTERPRISE]: {
    name: 'Enterprise',
    description: 'Custom solutions for large teams',
    price: null, // Custom pricing
    features: [
      'Unlimited projects',
      'Unlimited keywords',
      'Unlimited data retention',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee'
    ],
    highlighted: false
  }
} as const;

/**
 * Error messages for subscription limits
 */
export const SUBSCRIPTION_ERRORS = {
  PROJECT_LIMIT: 'You have reached your project limit. Please upgrade your plan to create more projects.',
  KEYWORD_LIMIT: 'You have reached your keyword limit for this project. Please upgrade your plan to add more keywords.',
  API_ACCESS: 'API access is not available on your current plan. Please upgrade to Pro or Enterprise.',
  FEATURE_LOCKED: 'This feature is not available on your current plan. Please upgrade to access it.'
} as const;

/**
 * Subscription-related cache keys
 */
export const CACHE_KEYS = {
  PROJECT_COUNT: (userId: string) => `limits:${userId}:projects`,
  KEYWORD_COUNT: (projectId: string) => `limits:${projectId}:keywords`,
  API_USAGE: (userId: string, date: string) => `api:${userId}:${date}`,
  USER_FEATURES: (userId: string) => `features:${userId}`
} as const;

/**
 * Cache TTL in seconds
 */
export const CACHE_TTL = {
  PROJECT_COUNT: 300, // 5 minutes
  KEYWORD_COUNT: 60, // 1 minute
  API_USAGE: 3600, // 1 hour
  USER_FEATURES: 600 // 10 minutes
} as const;