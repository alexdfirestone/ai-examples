export interface ParsedSection {
  title: string;
  description: string;
  lastUpdated: string;
  source: string;
  content: string;
}

const DELIMITER = "-".repeat(80);

/**
 * Normalize content before hashing to avoid false-positive diffs from
 * trivial whitespace differences between fetches.
 *
 * - CRLF → LF (Windows line endings)
 * - Strip trailing whitespace from each line
 * - Trim leading/trailing blank lines
 */
export function normalizeContent(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

/**
 * Parse the llms-full.txt document into individual sections.
 *
 * Format:
 * --------------------------------------------------------------------------------
 * title: "Section Title"
 * description: "Description text."
 * last_updated: "2026-02-17T23:11:07.574Z"
 * source: "https://vercel.com/docs/..."
 * --------------------------------------------------------------------------------
 *
 * # Section content in markdown...
 */
export function parseDocument(raw: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const lines = raw.split("\n");

  let i = 0;
  while (i < lines.length) {
    // Find opening delimiter
    if (lines[i].trim() !== DELIMITER) {
      i++;
      continue;
    }

    // Read metadata lines until closing delimiter
    i++;
    const metadata: Record<string, string> = {};
    while (i < lines.length && lines[i].trim() !== DELIMITER) {
      const match = lines[i].match(/^(\w[\w_]*)\s*:\s*"(.+)"\s*$/);
      if (match) {
        metadata[match[1]] = match[2];
      }
      i++;
    }

    // Skip closing delimiter
    if (i < lines.length && lines[i].trim() === DELIMITER) {
      i++;
    }

    // Read content until next opening delimiter
    const contentLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== DELIMITER) {
      contentLines.push(lines[i]);
      i++;
    }

    // We found the next delimiter — don't increment i, let the outer loop pick it up

    const title = metadata["title"] || "";
    const description = metadata["description"] || "";
    const lastUpdated = metadata["last_updated"] || "";
    const source = metadata["source"] || "";
    const content = normalizeContent(contentLines.join("\n"));

    if (title && source) {
      sections.push({ title, description, lastUpdated, source, content });
    }
  }

  return sections;
}

/**
 * SHA-256 hash for reliable content comparison between snapshots.
 */
export async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create a URL-safe slug from a source URL for use as a filename.
 */
export function sourceToSlug(source: string): string {
  return source
    .replace("https://vercel.com/docs/", "")
    .replace(/\//g, "-")
    .replace(/[^a-z0-9-]/gi, "")
    .toLowerCase();
}
