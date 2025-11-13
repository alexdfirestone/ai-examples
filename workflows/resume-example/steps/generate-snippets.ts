// Generate recruiter-facing snippets

import type { EnrichedProfile, Snippets, ToolCall } from "../types";
import { writeStreamUpdate } from "./stream-writer";

export async function generateSnippets(
  enriched: EnrichedProfile,
  writable?: WritableStream
): Promise<Snippets> {
  "use step";

  const toolCalls: ToolCall[] = [];

  // Track headline generation
  const tool1 = {
    name: "generateHeadline",
    description: "Create concise headline from profile data",
    timestamp: Date.now(),
  };
  toolCalls.push(tool1);
  if (writable) {
    await writeStreamUpdate(writable, {
      step: "generate-snippets",
      status: "tool-call",
      data: { toolCalls },
      timestamp: Date.now(),
    });
  }

  const title =
    enriched.canonical.headline ||
    enriched.canonical.experience?.[0]?.title ||
    "Software Engineer";

  const skillCount = Math.min(10, enriched.canonical.skills?.length || 0);
  const headline = `${title} • ${skillCount} key skills • Score ${enriched.overallScore}/100`;

  // Track bio generation
  const tool2 = {
    name: "generateBio",
    description: "Create short bio with top skills",
    timestamp: Date.now(),
  };
  toolCalls.push(tool2);
  if (writable) {
    await writeStreamUpdate(writable, {
      step: "generate-snippets",
      status: "tool-call",
      data: { toolCalls },
      timestamp: Date.now(),
    });
  }

  const topSkills = (enriched.canonical.skills || []).slice(0, 8).join(", ");
  const bio = `Impact-focused ${title}. Top skills: ${topSkills}.`;

  // Track highlights extraction
  const tool3 = {
    name: "extractHighlights",
    description: "Extract top 3 experience highlights",
    timestamp: Date.now(),
  };
  toolCalls.push(tool3);
  if (writable) {
    await writeStreamUpdate(writable, {
      step: "generate-snippets",
      status: "tool-call",
      data: { toolCalls },
      timestamp: Date.now(),
    });
  }

  const highlights = (enriched.canonical.experience || [])
    .slice(0, 3)
    .map((e) => `• ${e.title} @ ${e.company}`);

  return { headline, bio, highlights };
}

