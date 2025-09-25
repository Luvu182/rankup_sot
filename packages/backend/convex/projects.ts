import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// Get all projects for the authenticated user
export const getProjects = query({
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

    // Get projects where user is owner or team member
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // TODO: Also get projects from teams the user belongs to
    
    return projects;
  },
});

// Get a single project by ID
export const getProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Check if user has access to this project
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // TODO: Check team membership as well
    if (project.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    return project;
  },
});

// Safe version of getProject that returns null instead of throwing
export const getProjectSafe = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      return null;
    }

    // Check if user has access to this project
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || project.userId !== user._id) {
      return null;
    }

    return project;
  },
});

// Create a new project
export const createProject = mutation({
  args: {
    name: v.string(),
    domain: v.string(),
    settings: v.optional(v.object({
      timezone: v.optional(v.string()),
      currency: v.optional(v.string()),
      language: v.optional(v.string()),
      locations: v.optional(v.array(v.string())),
      searchEngines: v.optional(v.array(v.string())),
      trackingFrequency: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))),
      competitorDomains: v.optional(v.array(v.string())),
      notificationSettings: v.optional(v.object({
        email: v.optional(v.boolean()),
        slack: v.optional(v.boolean()),
        webhook: v.optional(v.string()),
      })),
    })),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
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

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    if (!domainRegex.test(args.domain)) {
      throw new Error("Invalid domain format");
    }

    // Check if project with this domain already exists for this user
    const existingProject = await ctx.db
      .query("projects")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .unique();

    if (existingProject) {
      throw new Error("Project with this domain already exists");
    }

    // Generate unique BigQuery project ID
    // Format: domain-slug-timestamp (guaranteed unique)
    const domainSlug = args.domain
      .toLowerCase()
      .replace(/\./g, '-')
      .replace(/[^a-z0-9-]/g, '');
    const timestamp = Date.now().toString(36);
    const bigQueryProjectId = `${domainSlug}-${timestamp}`;

    const projectId = await ctx.db.insert("projects", {
      userId: user._id,
      teamId: undefined, // Will be implemented with team features
      name: args.name,
      domain: args.domain,
      isPublic: args.isPublic ?? false,
      bigQueryProjectId,
      syncStatus: "pending",
      syncRetryCount: 0,
      settings: {
        timezone: args.settings?.timezone ?? "UTC",
        currency: args.settings?.currency ?? "USD",
        language: args.settings?.language ?? "en",
        locations: args.settings?.locations ?? ["United States"],
        searchEngines: args.settings?.searchEngines ?? ["google"],
        trackingFrequency: args.settings?.trackingFrequency ?? "daily",
        competitorDomains: args.settings?.competitorDomains ?? [],
        notificationSettings: {
          email: args.settings?.notificationSettings?.email ?? true,
          slack: args.settings?.notificationSettings?.slack ?? false,
          webhook: args.settings?.notificationSettings?.webhook,
        },
      },
      cachedStats: {
        totalKeywords: 0,
        avgPosition: 0,
        improvingKeywords: 0,
        decliningKeywords: 0,
        topKeywords: 0,
        lastUpdated: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Note: BigQuery sync happens via API call from frontend after project creation

    // Return both IDs for syncing and status updates
    return {
      projectId,
      bigQueryProjectId
    };
  },
});

// Update a project
export const updateProject = mutation({
  args: {
    projectId: v.id("projects"),
    updates: v.object({
      name: v.optional(v.string()),
      domain: v.optional(v.string()),
      settings: v.optional(v.object({
        timezone: v.optional(v.string()),
        currency: v.optional(v.string()),
        language: v.optional(v.string()),
        locations: v.optional(v.array(v.string())),
        searchEngines: v.optional(v.array(v.string())),
        trackingFrequency: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))),
        competitorDomains: v.optional(v.array(v.string())),
        notificationSettings: v.optional(v.object({
          email: v.optional(v.boolean()),
          slack: v.optional(v.boolean()),
          webhook: v.optional(v.string()),
        })),
      })),
      isPublic: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Check if user has access to this project
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    if (project.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    // If updating domain, validate format
    if (args.updates.domain) {
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
      if (!domainRegex.test(args.updates.domain)) {
        throw new Error("Invalid domain format");
      }

      // Check if new domain already exists for another project
      const existingProject = await ctx.db
        .query("projects")
        .withIndex("by_domain", (q) => q.eq("domain", args.updates.domain!))
        .filter((q) => q.neq(q.field("_id"), args.projectId))
        .filter((q) => q.eq(q.field("userId"), user._id))
        .unique();

      if (existingProject) {
        throw new Error("Project with this domain already exists");
      }

      // Domain changed - no verification needed
    }

    // Merge settings if provided
    let updatedSettings = project.settings;
    if (args.updates.settings) {
      updatedSettings = {
        ...project.settings,
        ...args.updates.settings,
        notificationSettings: args.updates.settings.notificationSettings
          ? { ...project.settings.notificationSettings, ...args.updates.settings.notificationSettings }
          : project.settings.notificationSettings,
      };
    }

    await ctx.db.patch(args.projectId, {
      ...args.updates,
      settings: updatedSettings,
      updatedAt: Date.now(),
    });

    return args.projectId;
  },
});

// Delete a project
export const deleteProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Check if user has access to this project
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    if (project.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    // Delete from BigQuery first via API
    // Note: We can't directly import BigQuery client in Convex functions
    // because they run in a special environment without Node.js modules
    
    // We'll handle BigQuery deletion from the frontend after Convex deletion
    // to avoid complications with the Convex runtime environment

    // Delete from Convex
    await ctx.db.delete(args.projectId);
  },
});

// Update bigQueryProjectId (for linking existing data)
export const updateBigQueryProjectId = mutation({
  args: { 
    projectId: v.id("projects"),
    bigQueryProjectId: v.string()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Check if user has access to this project
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    if (project.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    // Update bigQueryProjectId
    await ctx.db.patch(args.projectId, {
      bigQueryProjectId: args.bigQueryProjectId,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Update project sync status
export const updateSyncStatus = mutation({
  args: {
    projectId: v.id("projects"),
    status: v.union(
      v.literal("pending"),
      v.literal("syncing"), 
      v.literal("synced"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("[updateSyncStatus] Called with:", args);
    
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the project to verify ownership
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      console.error("[updateSyncStatus] Project not found:", args.projectId);
      throw new Error("Project not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || project.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    const updateData: any = {
      syncStatus: args.status,
      updatedAt: Date.now(),
    };

    if (args.status === "failed") {
      updateData.syncError = args.error;
      updateData.syncRetryCount = ((project.syncRetryCount as number | undefined) || 0) + 1;
    } else if (args.status === "synced") {
      updateData.syncError = undefined;
      updateData.syncRetryCount = 0;
    }

    await ctx.db.patch(args.projectId, updateData);
    console.log("[updateSyncStatus] Updated project with:", updateData);

    // Create notification for user
    if (args.status === "synced") {
      await ctx.db.insert("notifications", {
        userId: identity.subject,
        projectId: args.projectId,
        type: "system",
        severity: "info",
        title: "Project khởi tạo thành công",
        message: `Dự án ${project.name} đã được khởi tạo và sẵn sàng sử dụng.`,
        isRead: false,
        isArchived: false,
        createdAt: Date.now(),
      });
    } else if (args.status === "failed" && ((project.syncRetryCount as number | undefined) || 0) >= 2) {
      await ctx.db.insert("notifications", {
        userId: identity.subject,
        projectId: args.projectId,
        type: "system",
        severity: "error",
        title: "Lỗi khởi tạo dự án",
        message: `Không thể khởi tạo dự án ${project.name}. Vui lòng liên hệ admin để được hỗ trợ.`,
        data: { error: args.error },
        isRead: false,
        isArchived: false,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});


