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
      domainVerified: false,
      domainVerificationCode: `rankup-verify-${Math.random().toString(36).substring(2, 15)}`,
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

    return projectId;
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

      // Reset domain verification if domain changed
      await ctx.db.patch(args.projectId, {
        domainVerified: false,
        domainVerificationCode: `rankup-verify-${Math.random().toString(36).substring(2, 15)}`,
      });
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

    // TODO: Delete associated data in BigQuery
    // TODO: Delete associated keywords, rankings, etc.

    await ctx.db.delete(args.projectId);
  },
});

// Verify domain ownership
export const verifyDomain = mutation({
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

    // TODO: Implement actual domain verification
    // This would typically involve:
    // 1. DNS TXT record verification
    // 2. HTML meta tag verification
    // 3. File upload verification
    // For now, we'll just mark it as verified

    await ctx.db.patch(args.projectId, {
      domainVerified: true,
      updatedAt: Date.now(),
    });

    return { verified: true };
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

// Get domain verification code
export const getDomainVerificationCode = query({
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

    return {
      verificationCode: project.domainVerificationCode,
      methods: [
        {
          type: "dns",
          record: "TXT",
          name: "_rankup-verify",
          value: project.domainVerificationCode,
        },
        {
          type: "meta",
          tag: `<meta name="rankup-verification" content="${project.domainVerificationCode}" />`,
        },
        {
          type: "file",
          path: `/rankup-verify-${project.domainVerificationCode}.txt`,
          content: project.domainVerificationCode,
        },
      ],
    };
  },
});