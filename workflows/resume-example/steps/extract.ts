// Text extraction and normalization step

import type { RawSources, ExtractedData, ToolCall } from "../types";
import { writeStreamUpdate } from "./stream-writer";

export async function extractAndNormalize(
  raw: RawSources,
  writable?: WritableStream
): Promise<ExtractedData> {
  "use step";

  const toolCalls: ToolCall[] = [];

  // Track text extraction
  const tool1 = {
    name: "textExtraction",
    description: "Combine resume, LinkedIn, and GitHub sources",
    timestamp: Date.now(),
  };
  toolCalls.push(tool1);
  if (writable) {
    await writeStreamUpdate(writable, {
      step: "extract",
      status: "tool-call",
      data: { toolCalls },
      timestamp: Date.now(),
    });
  }

  // Combine all sources into a single text block
  const text = [
    raw.resumeText,
    stripHtml(raw.linkedInHtml || ""),
    raw.githubReadme,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Track normalization
  const tool2 = {
    name: "normalize",
    description: "Strip HTML and normalize whitespace",
    timestamp: Date.now(),
  };
  toolCalls.push(tool2);
  if (writable) {
    await writeStreamUpdate(writable, {
      step: "extract",
      status: "tool-call",
      data: { toolCalls },
      timestamp: Date.now(),
    });
  }

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

