import { v } from "convex/values";
import { action } from "./_generated/server";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

const DOCS_URL = "https://vercel.com/docs/llms-full.txt";
const DELIMITER = "-".repeat(80);
const BATCH_SIZE = 50;

interface ParsedSection {
  title: string;
  description: string;
  lastUpdated: string;
  source: string;
  content: string;
  contentHash: string;
}

/**
 * Normalize content before hashing to avoid false-positive diffs from
 * trivial whitespace differences between fetches.
 */
function normalizeContent(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function parseRawDocument(raw: string): Promise<ParsedSection[]> {
  const sections: ParsedSection[] = [];
  const lines = raw.split("\n");

  // First pass: extract raw sections without hashing
  const rawSections: {
    title: string;
    description: string;
    lastUpdated: string;
    source: string;
    content: string;
  }[] = [];

  let i = 0;
  while (i < lines.length) {
    if (lines[i].trim() !== DELIMITER) {
      i++;
      continue;
    }

    i++;
    const metadata: Record<string, string> = {};
    while (i < lines.length && lines[i].trim() !== DELIMITER) {
      const match = lines[i].match(/^(\w[\w_]*)\s*:\s*"(.+)"\s*$/);
      if (match) {
        metadata[match[1]] = match[2];
      }
      i++;
    }

    if (i < lines.length && lines[i].trim() === DELIMITER) {
      i++;
    }

    const contentLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== DELIMITER) {
      contentLines.push(lines[i]);
      i++;
    }

    const title = metadata["title"] || "";
    const description = metadata["description"] || "";
    const lastUpdated = metadata["last_updated"] || "";
    const source = metadata["source"] || "";
    const content = normalizeContent(contentLines.join("\n"));

    if (title && source) {
      rawSections.push({ title, description, lastUpdated, source, content });
    }
  }

  // Second pass: hash all content in parallel
  const hashes = await Promise.all(
    rawSections.map((s) => hashContent(s.content))
  );

  for (let j = 0; j < rawSections.length; j++) {
    sections.push({
      ...rawSections[j],
      contentHash: hashes[j],
    });
  }

  return sections;
}

export const createSnapshot = internalMutation({
  args: {
    fetchedAt: v.number(),
    storageId: v.id("_storage"),
    sectionCount: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("snapshots", {
      fetchedAt: args.fetchedAt,
      storageId: args.storageId,
      sectionCount: args.sectionCount,
    });
  },
});

export const insertSectionsBatch = internalMutation({
  args: {
    sections: v.array(
      v.object({
        snapshotId: v.id("snapshots"),
        title: v.string(),
        description: v.string(),
        lastUpdated: v.string(),
        source: v.string(),
        content: v.string(),
        contentHash: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const section of args.sections) {
      await ctx.db.insert("sections", section);
    }
  },
});

export const fetchAndStore = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching Vercel docs...");

    const response = await fetch(DOCS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch docs: ${response.status}`);
    }

    const rawText = await response.text();
    console.log(`Fetched ${rawText.length} characters`);

    // Store raw file in Convex file storage
    const blob = new Blob([rawText], { type: "text/plain" });
    const storageId = await ctx.storage.store(blob);

    // Parse sections
    const sections = await parseRawDocument(rawText);
    console.log(`Parsed ${sections.length} sections`);

    // Create snapshot record
    const fetchedAt = Date.now();
    const snapshotId = await ctx.runMutation(internal.snapshots.createSnapshot, {
      fetchedAt,
      storageId,
      sectionCount: sections.length,
    });

    // Insert sections in batches
    for (let i = 0; i < sections.length; i += BATCH_SIZE) {
      const batch = sections.slice(i, i + BATCH_SIZE).map((s) => ({
        snapshotId,
        title: s.title,
        description: s.description,
        lastUpdated: s.lastUpdated,
        source: s.source,
        content: s.content,
        contentHash: s.contentHash,
      }));

      await ctx.runMutation(internal.snapshots.insertSectionsBatch, {
        sections: batch,
      });
    }

    console.log(`Stored snapshot with ${sections.length} sections`);
    return { snapshotId, sectionCount: sections.length };
  },
});

// Public action so you can trigger a fetch from the UI or CLI
export const triggerFetch = action({
  args: {},
  handler: async (ctx) => {
    return await ctx.runAction(internal.snapshots.fetchAndStore);
  },
});
