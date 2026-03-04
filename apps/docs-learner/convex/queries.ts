import { v } from "convex/values";
import { query } from "./_generated/server";

export type ChangeType = "added" | "modified" | "removed";

export interface SectionChange {
  type: ChangeType;
  title: string;
  source: string;
  description: string;
  oldContent?: string;
  newContent?: string;
  lastUpdated: string;
}

const PERIOD_MS: Record<string, number> = {
  "1d": 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
  "1m": 30 * 24 * 60 * 60 * 1000,
};

export const getSnapshots = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("snapshots")
      .withIndex("by_fetchedAt")
      .order("desc")
      .take(30);
  },
});

// Get all sections from the latest snapshot (for browsing)
export const getLatestSections = query({
  args: {},
  handler: async (ctx) => {
    const latestSnapshot = await ctx.db
      .query("snapshots")
      .withIndex("by_fetchedAt")
      .order("desc")
      .first();

    if (!latestSnapshot) {
      return { sections: [], hasData: false };
    }

    const sections = await ctx.db
      .query("sections")
      .withIndex("by_snapshot", (q) => q.eq("snapshotId", latestSnapshot._id))
      .collect();

    // Return without full content for the list view (just metadata)
    return {
      sections: sections.map((s) => ({
        _id: s._id,
        title: s.title,
        description: s.description,
        source: s.source,
        lastUpdated: s.lastUpdated,
      })),
      hasData: true,
      snapshotDate: latestSnapshot.fetchedAt,
    };
  },
});

// Get full content for specific sections by source URLs
export const getSectionsBySource = query({
  args: {
    sources: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const latestSnapshot = await ctx.db
      .query("snapshots")
      .withIndex("by_fetchedAt")
      .order("desc")
      .first();

    if (!latestSnapshot) return [];

    const results = [];
    for (const source of args.sources) {
      const section = await ctx.db
        .query("sections")
        .withIndex("by_snapshot_and_source", (q) =>
          q.eq("snapshotId", latestSnapshot._id).eq("source", source)
        )
        .first();
      if (section) {
        results.push({
          title: section.title,
          description: section.description,
          source: section.source,
          content: section.content,
          lastUpdated: section.lastUpdated,
        });
      }
    }
    return results;
  },
});

export const getChangedSections = query({
  args: {
    period: v.union(
      v.literal("1d"),
      v.literal("1w"),
      v.literal("1m"),
      v.literal("all")
    ),
  },
  handler: async (ctx, args) => {
    // Get all snapshots ordered by date
    const allSnapshots = await ctx.db
      .query("snapshots")
      .withIndex("by_fetchedAt")
      .order("desc")
      .collect();

    if (allSnapshots.length === 0) {
      return { changes: [] as SectionChange[], hasData: false, isFirstSnapshot: false };
    }

    if (allSnapshots.length === 1) {
      return { changes: [] as SectionChange[], hasData: true, isFirstSnapshot: true };
    }

    const latestSnapshot = allSnapshots[0];

    // Find the comparison snapshot based on period
    let comparisonSnapshot;
    if (args.period === "all") {
      comparisonSnapshot = allSnapshots[allSnapshots.length - 1];
    } else {
      const cutoff = Date.now() - PERIOD_MS[args.period];
      // Find the snapshot closest to (but before) the cutoff
      comparisonSnapshot = allSnapshots.find((s) => s.fetchedAt <= cutoff);
      // If no snapshot is old enough, use the oldest one
      if (!comparisonSnapshot) {
        comparisonSnapshot = allSnapshots[allSnapshots.length - 1];
      }
    }

    // If the comparison snapshot is the same as the latest, no changes
    if (comparisonSnapshot._id === latestSnapshot._id) {
      return {
        changes: [] as SectionChange[],
        hasData: true,
        isFirstSnapshot: false,
        latestDate: latestSnapshot.fetchedAt,
        comparisonDate: comparisonSnapshot.fetchedAt,
      };
    }

    // Get sections for both snapshots
    const currentSections = await ctx.db
      .query("sections")
      .withIndex("by_snapshot", (q) => q.eq("snapshotId", latestSnapshot._id))
      .collect();

    const previousSections = await ctx.db
      .query("sections")
      .withIndex("by_snapshot", (q) =>
        q.eq("snapshotId", comparisonSnapshot!._id)
      )
      .collect();

    // Build map of previous sections by source URL
    const prevMap = new Map(previousSections.map((s) => [s.source, s]));
    const currentSources = new Set<string>();
    const changes: SectionChange[] = [];

    for (const section of currentSections) {
      currentSources.add(section.source);
      const prev = prevMap.get(section.source);

      if (!prev) {
        changes.push({
          type: "added",
          title: section.title,
          source: section.source,
          description: section.description,
          newContent: section.content,
          lastUpdated: section.lastUpdated,
        });
      } else if (prev.contentHash !== section.contentHash) {
        changes.push({
          type: "modified",
          title: section.title,
          source: section.source,
          description: section.description,
          oldContent: prev.content,
          newContent: section.content,
          lastUpdated: section.lastUpdated,
        });
      }
    }

    for (const prev of previousSections) {
      if (!currentSources.has(prev.source)) {
        changes.push({
          type: "removed",
          title: prev.title,
          source: prev.source,
          description: prev.description,
          oldContent: prev.content,
          lastUpdated: prev.lastUpdated,
        });
      }
    }

    return {
      changes,
      hasData: true,
      isFirstSnapshot: false,
      latestDate: latestSnapshot.fetchedAt,
      comparisonDate: comparisonSnapshot.fetchedAt,
    };
  },
});

// ─── Admin queries ─────────────────────────────────────────────────────────────
// Split into lightweight queries to stay under Convex's 16MB read limit.
// Full content is loaded on-demand, not for every section in every snapshot.

/**
 * Lightweight metadata for one snapshot's sections — no content blobs.
 * Used for the admin list view and client-side status computation.
 */
export const getSnapshotMeta = query({
  args: { snapshotId: v.id("snapshots") },
  handler: async (ctx, args) => {
    const sections = await ctx.db
      .query("sections")
      .withIndex("by_snapshot", (q) => q.eq("snapshotId", args.snapshotId))
      .collect();

    return sections.map((s) => ({
      title: s.title,
      description: s.description,
      source: s.source,
      contentHash: s.contentHash,
      lastUpdated: s.lastUpdated,
    }));
  },
});

/**
 * Load full content for a single section (for expanding in the admin UI).
 * Returns content from the selected snapshot and optionally the comparison.
 */
export const getSectionContent = query({
  args: {
    snapshotId: v.id("snapshots"),
    compareToSnapshotId: v.optional(v.id("snapshots")),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const current = await ctx.db
      .query("sections")
      .withIndex("by_snapshot_and_source", (q) =>
        q.eq("snapshotId", args.snapshotId).eq("source", args.source)
      )
      .first();

    let oldContent: string | undefined;
    if (args.compareToSnapshotId) {
      const prev = await ctx.db
        .query("sections")
        .withIndex("by_snapshot_and_source", (q) =>
          q.eq("snapshotId", args.compareToSnapshotId!).eq("source", args.source)
        )
        .first();
      oldContent = prev?.content;
    }

    return {
      content: current?.content ?? "",
      oldContent,
    };
  },
});

/**
 * Batch-load content pairs for modified sections to compute magnitude stats.
 * Accepts a list of source URLs (max ~100 at a time to stay under limits).
 */
export const getModifiedContentBatch = query({
  args: {
    snapshotId: v.id("snapshots"),
    compareToSnapshotId: v.id("snapshots"),
    sources: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Cap at 100 to stay well under read limits (~100 × 2 docs × ~10KB = ~2MB)
    const capped = args.sources.slice(0, 100);
    const results: {
      source: string;
      content: string;
      oldContent: string;
    }[] = [];

    for (const source of capped) {
      const current = await ctx.db
        .query("sections")
        .withIndex("by_snapshot_and_source", (q) =>
          q.eq("snapshotId", args.snapshotId).eq("source", source)
        )
        .first();
      const prev = await ctx.db
        .query("sections")
        .withIndex("by_snapshot_and_source", (q) =>
          q.eq("snapshotId", args.compareToSnapshotId).eq("source", source)
        )
        .first();

      if (current && prev) {
        results.push({
          source,
          content: current.content,
          oldContent: prev.content,
        });
      }
    }

    return results;
  },
});
