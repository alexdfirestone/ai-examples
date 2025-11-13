// Text extraction and normalization step

import type { RawSources, ExtractedData } from "../types";

export async function extractAndNormalize(
  raw: RawSources
): Promise<ExtractedData> {
  "use step";

  // Combine all sources into a single text block
  const text = [
    raw.resumeText,
    stripHtml(raw.linkedInHtml || ""),
    raw.githubReadme,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Rough token estimation (4 chars per token)
  const tokens = Math.min(16000, Math.round((text.length || 0) / 4));

  return { text, tokens };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

