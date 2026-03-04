import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  snapshots: defineTable({
    fetchedAt: v.number(),
    storageId: v.id("_storage"),
    sectionCount: v.number(),
  }).index("by_fetchedAt", ["fetchedAt"]),

  sections: defineTable({
    snapshotId: v.id("snapshots"),
    title: v.string(),
    description: v.string(),
    lastUpdated: v.string(),
    source: v.string(),
    content: v.string(),
    contentHash: v.string(),
  })
    .index("by_snapshot", ["snapshotId"])
    .index("by_snapshot_and_source", ["snapshotId", "source"]),
});
