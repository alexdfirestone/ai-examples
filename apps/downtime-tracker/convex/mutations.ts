import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";

// --- Public mutations for the UI ---

export const addRegistration = mutation({
  args: {
    name: v.string(),
    competitorName: v.string(),
    slackUserId: v.optional(v.string()),
    sfdcAccountUrl: v.optional(v.string()),
    sharedChannelUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("registrations", args);
  },
});

export const removeRegistration = mutation({
  args: { id: v.id("registrations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// --- Internal mutations used by the statusCheck action ---

export const insertSnapshots = internalMutation({
  args: {
    snapshots: v.array(
      v.object({
        competitorName: v.string(),
        resourceName: v.string(),
        status: v.string(),
        incidentDescription: v.optional(v.string()),
        checkedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const snapshot of args.snapshots) {
      await ctx.db.insert("snapshots", snapshot);
    }
  },
});

export const createAlertThread = internalMutation({
  args: {
    competitorName: v.string(),
    slackThreadTs: v.string(),
    slackChannelId: v.string(),
    status: v.string(),
    startedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("alertThreads", args);
  },
});

export const resolveAlertThread = internalMutation({
  args: {
    id: v.id("alertThreads"),
    resolvedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { resolvedAt: args.resolvedAt });
  },
});
