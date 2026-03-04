import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  snapshots: defineTable({
    competitorName: v.string(),
    resourceName: v.string(),
    status: v.string(),
    incidentDescription: v.optional(v.string()),
    checkedAt: v.number(),
  })
    .index("by_competitor", ["competitorName", "checkedAt"])
    .index("by_checkedAt", ["checkedAt"]),

  registrations: defineTable({
    name: v.string(),
    competitorName: v.string(),
    slackUserId: v.optional(v.string()),
    sfdcAccountUrl: v.optional(v.string()),
    sharedChannelUrl: v.optional(v.string()),
  }).index("by_competitor", ["competitorName"]),

  alertThreads: defineTable({
    competitorName: v.string(),
    slackThreadTs: v.string(),
    slackChannelId: v.string(),
    status: v.string(),
    startedAt: v.number(),
    resolvedAt: v.optional(v.number()),
  }).index("by_competitor", ["competitorName"]),
});
