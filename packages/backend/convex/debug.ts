import { query } from "./_generated/server";

export const testAuth = query({
  args: {},
  handler: async (ctx) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      return {
        isAuthenticated: !!identity,
        identity: identity,
        error: null
      };
    } catch (error) {
      return {
        isAuthenticated: false,
        identity: null,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});