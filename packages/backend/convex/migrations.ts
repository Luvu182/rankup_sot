import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Delete all projects - USE WITH CAUTION
export const deleteAllProjects = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    // Get user to verify they can perform this action
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Get all projects for this user
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    
    let deleted = 0;
    
    for (const project of projects) {
      await ctx.db.delete(project._id);
      deleted++;
    }
    
    return {
      success: true,
      message: `Deleted ${deleted} projects for current user`,
      deleted
    };
  },
});

// Get project count for current user
export const getProjectStats = mutation({
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
    
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    
    const projectInfo = projects.map(p => ({
      id: p._id,
      name: p.name,
      domain: p.domain,
      hasLegacyFields: !!(p as any).domainVerificationCode || !!(p as any).domainVerified,
      hasSyncStatus: !!(p as any).syncStatus,
      createdAt: new Date(p.createdAt).toISOString()
    }));
    
    return {
      total: projects.length,
      projects: projectInfo
    };
  },
});