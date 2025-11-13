// Generate recruiter-facing snippets

import type { EnrichedProfile, Snippets } from "../types";

export async function generateSnippets(
  enriched: EnrichedProfile
): Promise<Snippets> {
  "use step";

  const title =
    enriched.canonical.headline ||
    enriched.canonical.experience?.[0]?.title ||
    "Software Engineer";

  const skillCount = Math.min(10, enriched.canonical.skills?.length || 0);
  const headline = `${title} • ${skillCount} key skills • Score ${enriched.overallScore}/100`;

  const topSkills = (enriched.canonical.skills || []).slice(0, 8).join(", ");
  const bio = `Impact-focused ${title}. Top skills: ${topSkills}.`;

  const highlights = (enriched.canonical.experience || [])
    .slice(0, 3)
    .map((e) => `• ${e.title} @ ${e.company}`);

  return { headline, bio, highlights };
}

