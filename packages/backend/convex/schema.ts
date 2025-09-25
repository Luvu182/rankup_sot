import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User Management (Clerk integration)
  users: defineTable({
    clerkId: v.string(),
    email: v.string(), 
    name: v.string(),
    role: v.string(), // admin, user, viewer
    teamId: v.optional(v.id("teams")),
    settings: v.object({
      timezone: v.string(),
      emailNotifications: v.boolean(),
      language: v.string(),
    }),
    subscription: v.object({
      tier: v.union(
        v.literal("free"),
        v.literal("starter"),
        v.literal("pro"),
        v.literal("enterprise")
      ),
      status: v.union(
        v.literal("active"),
        v.literal("cancelled"),
        v.literal("past_due"),
        v.literal("trial")
      ),
      validUntil: v.optional(v.number()),
      // Usage tracking
      usage: v.object({
        projectsCount: v.number(),
        totalKeywords: v.number(),
        apiCallsToday: v.number(),
        lastResetDate: v.string(), // ISO date
      }),
      // Billing info
      billingCycle: v.optional(v.union(v.literal("monthly"), v.literal("yearly"))),
      nextBillingDate: v.optional(v.number()),
      paymentMethod: v.optional(v.string()), // last 4 digits
    }),
    createdAt: v.number(),
    lastLogin: v.number(),
  })
    .index("by_clerk", ["clerkId"])
    .index("by_team", ["teamId"]),

  // Team Management
  teams: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    members: v.array(v.id("users")),
    settings: v.object({
      defaultTimezone: v.string(),
    }),
    createdAt: v.number(),
  }),

  // Project Metadata (chỉ metadata, data thực ở BigQuery)
  projects: defineTable({
    userId: v.id("users"), // Changed to use users table ID
    teamId: v.optional(v.id("teams")),
    name: v.string(),
    domain: v.string(),
    isPublic: v.boolean(),
    bigQueryProjectId: v.string(), // Reference to BigQuery project_id in tables
    syncStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("syncing"),
      v.literal("synced"),
      v.literal("failed")
    )),
    syncError: v.optional(v.string()),
    syncRetryCount: v.optional(v.number()),
    settings: v.object({
      timezone: v.string(),
      currency: v.string(),
      language: v.string(),
      locations: v.array(v.string()),
      searchEngines: v.array(v.string()),
      trackingFrequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
      competitorDomains: v.array(v.string()),
      notificationSettings: v.object({
        email: v.boolean(),
        slack: v.boolean(),
        webhook: v.optional(v.string()),
      }),
    }),
    // Cached stats từ BigQuery (update định kỳ)
    cachedStats: v.object({
      totalKeywords: v.number(),
      avgPosition: v.number(),
      improvingKeywords: v.number(),
      decliningKeywords: v.number(),
      topKeywords: v.number(),
      lastUpdated: v.number(),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_team", ["teamId"])
    .index("by_domain", ["domain"]),

  // Notifications & Alerts
  notifications: defineTable({
    userId: v.string(), // Clerk user ID
    projectId: v.optional(v.id("projects")),
    type: v.string(), // ranking_change, competitor_alert, system
    severity: v.string(), // info, warning, error, critical
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
    isRead: v.boolean(),
    isArchived: v.boolean(),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_created", ["createdAt"]),

  // Real-time Ranking Updates (temporary, for live updates)
  rankingUpdates: defineTable({
    projectId: v.id("projects"),
    type: v.string(), // position_change, new_ranking, lost_ranking
    data: v.object({
      keywordId: v.string(), // BigQuery keyword ID
      keyword: v.string(),
      previousPosition: v.optional(v.number()),
      currentPosition: v.optional(v.number()),
      change: v.optional(v.number()),
      url: v.optional(v.string()),
    }),
    timestamp: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_timestamp", ["timestamp"]),

  // API Keys & Access
  apiKeys: defineTable({
    userId: v.string(), // Clerk user ID
    name: v.string(),
    keyHash: v.string(), // Hashed API key
    lastFourChars: v.string(), // For display
    permissions: v.array(v.string()),
    rateLimit: v.object({
      requests: v.number(),
      period: v.string(), // hour, day, month
    }),
    usage: v.object({
      requests: v.number(),
      lastUsed: v.optional(v.number()),
    }),
    isActive: v.boolean(),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_last_four", ["lastFourChars"]),

  // Activity Logs (recent only, archive to BigQuery)
  activityLogs: defineTable({
    userId: v.string(), // Clerk user ID
    action: v.string(),
    resource: v.string(),
    resourceId: v.optional(v.string()),
    details: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),

  // Legacy - remove later
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
});