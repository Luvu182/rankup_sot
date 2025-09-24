import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a new user when they sign up via Clerk
 * Called from webhook when user.created event is triggered
 */
export const createUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    
    if (existingUser) {
      console.log(`User ${args.clerkId} already exists`);
      return existingUser._id;
    }
    
    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      role: "user", // default role
      settings: {
        timezone: "UTC",
        emailNotifications: true,
        language: "en",
      },
      subscription: {
        tier: "free", // Clerk Billing will update this
        status: "active",
        usage: {
          projectsCount: 0,
          totalKeywords: 0,
          apiCallsToday: 0,
          lastResetDate: new Date().toISOString().split('T')[0],
        },
      },
      createdAt: Date.now(),
      lastLogin: Date.now(),
    });
    
    console.log(`Created user ${args.clerkId} with ID ${userId}`);
    return userId;
  },
});

/**
 * Update user information
 * Called from webhook when user.updated event is triggered
 */
export const updateUser = mutation({
  args: {
    clerkId: v.string(),
    updates: v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    
    if (!user) {
      throw new Error(`User ${args.clerkId} not found`);
    }
    
    await ctx.db.patch(user._id, args.updates);
    
    console.log(`Updated user ${args.clerkId}`);
    return user._id;
  },
});

/**
 * Get user by Clerk ID
 * Used internally by other queries/mutations
 */
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

/**
 * Update user's last login time
 */
export const updateLastLogin = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    
    if (user) {
      await ctx.db.patch(user._id, {
        lastLogin: Date.now(),
      });
    }
  },
});

/**
 * Get user's current usage statistics
 */
export const getUserUsage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Count actual projects
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    
    // Return usage stats
    return {
      projectsCount: projects.length,
      totalKeywords: user.subscription.usage.totalKeywords, // This would need to be calculated from BigQuery
      apiCallsToday: user.subscription.usage.apiCallsToday,
      lastUpdated: user.subscription.usage.lastResetDate,
    };
  },
});

/**
 * Soft delete user (mark as deleted but keep data)
 */
export const softDeleteUser = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    
    if (!user) {
      throw new Error(`User ${args.clerkId} not found`);
    }
    
    // Mark user as deleted by changing role
    await ctx.db.patch(user._id, {
      role: "deleted",
    });
    
    console.log(`Soft deleted user ${args.clerkId}`);
    
    // TODO: Archive user's projects and data
    // TODO: Cancel any active API keys
    
    return user._id;
  },
});

/**
 * Ensure user exists in database (create if not exists)
 * Used when user logs in but webhook hasn't been triggered
 */
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
    
    if (existingUser) {
      // Update last login
      await ctx.db.patch(existingUser._id, {
        lastLogin: Date.now(),
      });
      return existingUser;
    }
    
    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email || "no-email@example.com",
      name: identity.name || identity.nickname || "User",
      role: "user",
      settings: {
        timezone: "UTC",
        emailNotifications: true,
        language: "en",
      },
      subscription: {
        tier: "free",
        status: "active",
        usage: {
          projectsCount: 0,
          totalKeywords: 0,
          apiCallsToday: 0,
          lastResetDate: new Date().toISOString().split('T')[0],
        },
      },
      createdAt: Date.now(),
      lastLogin: Date.now(),
    });
    
    console.log(`Auto-created user ${identity.subject} with ID ${userId}`);
    
    const newUser = await ctx.db.get(userId);
    return newUser;
  },
});