import { v } from "convex/values";
import { query, internalQuery } from "./_generated/server";

const COMPETITOR_NAMES = ["E2B", "Daytona", "Modal"];

export const getLatestPerCompetitor = query({
  args: {},
  handler: async (ctx) => {
    const results = [];
    for (const name of COMPETITOR_NAMES) {
      const latest = await ctx.db
        .query("snapshots")
        .withIndex("by_competitor", (q) => q.eq("competitorName", name))
        .order("desc")
        .first();
      if (latest) results.push(latest);
    }
    return results;
  },
});

export const getSnapshotHistory = query({
  args: {
    competitorName: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("snapshots")
      .withIndex("by_competitor", (q) =>
        q.eq("competitorName", args.competitorName)
      )
      .order("desc")
      .take(args.limit ?? 100);
  },
});

export const getRegistrations = query({
  args: {
    competitorName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.competitorName) {
      return await ctx.db
        .query("registrations")
        .withIndex("by_competitor", (q) =>
          q.eq("competitorName", args.competitorName!)
        )
        .collect();
    }
    return await ctx.db.query("registrations").collect();
  },
});

// --- Internal queries used by the statusCheck action ---

export const getPreviousSnapshot = internalQuery({
  args: {
    competitorName: v.string(),
    beforeTimestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("snapshots")
      .withIndex("by_competitor", (q) =>
        q
          .eq("competitorName", args.competitorName)
          .lt("checkedAt", args.beforeTimestamp)
      )
      .order("desc")
      .first();
  },
});

export const getRegistrationsByCompetitor = internalQuery({
  args: { competitorName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("registrations")
      .withIndex("by_competitor", (q) =>
        q.eq("competitorName", args.competitorName)
      )
      .collect();
  },
});

export const getActiveAlertThread = internalQuery({
  args: { competitorName: v.string() },
  handler: async (ctx, args) => {
    const threads = await ctx.db
      .query("alertThreads")
      .withIndex("by_competitor", (q) =>
        q.eq("competitorName", args.competitorName)
      )
      .order("desc")
      .collect();
    return threads.find((t) => t.resolvedAt === undefined) ?? null;
  },
});
