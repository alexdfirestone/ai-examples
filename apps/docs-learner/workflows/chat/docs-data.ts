import type { SectionChange } from "@/convex/queries";

function sourceToSlug(source: string): string {
  return source
    .replace("https://vercel.com/docs/", "")
    .replace(/\//g, "-")
    .replace(/[^a-z0-9-]/gi, "")
    .toLowerCase();
}

interface SandboxFile {
  path: string;
  content: string;
}

// --- For "changes" mode ---

export function generateChangesSandboxFiles(
  changes: SectionChange[]
): SandboxFile[] {
  const files: SandboxFile[] = [];

  const added = changes.filter((c) => c.type === "added");
  const modified = changes.filter((c) => c.type === "modified");
  const removed = changes.filter((c) => c.type === "removed");

  let summary = `VERCEL DOCS CHANGES SUMMARY\n${"=".repeat(40)}\n\n`;
  summary += `Total changes: ${changes.length}\n`;
  summary += `  Added:    ${added.length}\n`;
  summary += `  Modified: ${modified.length}\n`;
  summary += `  Removed:  ${removed.length}\n\n`;

  if (added.length > 0) {
    summary += `ADDED SECTIONS:\n`;
    for (const c of added) {
      summary += `  - ${c.title} (${c.source})\n`;
    }
    summary += `\n`;
  }

  if (modified.length > 0) {
    summary += `MODIFIED SECTIONS:\n`;
    for (const c of modified) {
      summary += `  - ${c.title} (${c.source})\n`;
    }
    summary += `\n`;
  }

  if (removed.length > 0) {
    summary += `REMOVED SECTIONS:\n`;
    for (const c of removed) {
      summary += `  - ${c.title} (${c.source})\n`;
    }
    summary += `\n`;
  }

  summary += `\nTo explore changes:\n`;
  summary += `  ls docs/modified/     - List modified sections\n`;
  summary += `  ls docs/added/        - List added sections\n`;
  summary += `  ls docs/removed/      - List removed sections\n`;
  summary += `  diff docs/modified/<slug>/old.md docs/modified/<slug>/new.md  - See exact changes\n`;

  files.push({ path: "docs/changes-summary.txt", content: summary });

  for (const change of modified) {
    const slug = sourceToSlug(change.source);
    if (change.oldContent) {
      files.push({
        path: `docs/modified/${slug}/old.md`,
        content: `# ${change.title}\n\nSource: ${change.source}\n\n${change.oldContent}`,
      });
    }
    if (change.newContent) {
      files.push({
        path: `docs/modified/${slug}/new.md`,
        content: `# ${change.title}\n\nSource: ${change.source}\n\n${change.newContent}`,
      });
    }
  }

  for (const change of added) {
    const slug = sourceToSlug(change.source);
    if (change.newContent) {
      files.push({
        path: `docs/added/${slug}.md`,
        content: `# ${change.title}\n\nSource: ${change.source}\n\n${change.newContent}`,
      });
    }
  }

  for (const change of removed) {
    const slug = sourceToSlug(change.source);
    if (change.oldContent) {
      files.push({
        path: `docs/removed/${slug}.md`,
        content: `# ${change.title}\n\nSource: ${change.source}\n\n${change.oldContent}`,
      });
    }
  }

  return files;
}

// --- For "focused change" mode (single change clicked by user) ---

export interface FocusedChange {
  source: string;
  type: string;
  title: string;
  oldContent?: string;
  newContent?: string;
}

export function generateFocusedSandboxFiles(
  focused: FocusedChange,
  changes: SectionChange[]
): SandboxFile[] {
  const files: SandboxFile[] = [];
  const slug = sourceToSlug(focused.source);

  // Write the actual content files for the focused change
  if (focused.oldContent) {
    files.push({
      path: `docs/focused/old.md`,
      content: `# ${focused.title}\n\nSource: ${focused.source}\n\n${focused.oldContent}`,
    });
  }
  if (focused.newContent) {
    files.push({
      path: `docs/focused/new.md`,
      content: `# ${focused.title}\n\nSource: ${focused.source}\n\n${focused.newContent}`,
    });
  }

  // Also write a lightweight summary of ALL changes (metadata only, no content)
  const added = changes.filter((c) => c.type === "added");
  const modified = changes.filter((c) => c.type === "modified");
  const removed = changes.filter((c) => c.type === "removed");

  let summary = `VERCEL DOCS CHANGES SUMMARY\n${"=".repeat(40)}\n\n`;
  summary += `Total changes: ${changes.length}\n`;
  summary += `  Added:    ${added.length}\n`;
  summary += `  Modified: ${modified.length}\n`;
  summary += `  Removed:  ${removed.length}\n\n`;

  if (added.length > 0) {
    summary += `ADDED SECTIONS:\n`;
    for (const c of added) summary += `  - ${c.title} (${c.source})\n`;
    summary += `\n`;
  }
  if (modified.length > 0) {
    summary += `MODIFIED SECTIONS:\n`;
    for (const c of modified) summary += `  - ${c.title} (${c.source})\n`;
    summary += `\n`;
  }
  if (removed.length > 0) {
    summary += `REMOVED SECTIONS:\n`;
    for (const c of removed) summary += `  - ${c.title} (${c.source})\n`;
    summary += `\n`;
  }

  summary += `\n${"=".repeat(40)}\n`;
  summary += `FOCUSED CHANGE: ${focused.title}\n`;
  summary += `  Source: ${focused.source}\n`;
  summary += `  Type: ${focused.type}\n`;
  summary += `  Slug: ${slug}\n\n`;

  if (focused.type === "modified") {
    summary += `  Compare with: diff docs/focused/old.md docs/focused/new.md\n`;
    summary += `  Read old:     cat docs/focused/old.md\n`;
    summary += `  Read new:     cat docs/focused/new.md\n`;
  } else if (focused.type === "added") {
    summary += `  Read content: cat docs/focused/new.md\n`;
  } else if (focused.type === "removed") {
    summary += `  Read content: cat docs/focused/old.md\n`;
  }

  files.push({ path: "docs/changes-summary.txt", content: summary });

  return files;
}

// --- For "browse" mode ---

export interface BrowseSection {
  title: string;
  description: string;
  source: string;
  content: string;
  lastUpdated: string;
}

export function generateBrowseSandboxFiles(
  sections: BrowseSection[]
): SandboxFile[] {
  const files: SandboxFile[] = [];

  let index = `LOADED DOCUMENTATION SECTIONS\n${"=".repeat(40)}\n\n`;
  index += `${sections.length} section(s) loaded:\n\n`;

  for (const section of sections) {
    const slug = sourceToSlug(section.source);
    index += `  - ${section.title}\n`;
    index += `    File: docs/sections/${slug}.md\n`;
    index += `    Source: ${section.source}\n\n`;

    files.push({
      path: `docs/sections/${slug}.md`,
      content: `# ${section.title}\n\n${section.description}\n\nSource: ${section.source}\nLast updated: ${section.lastUpdated}\n\n---\n\n${section.content}`,
    });
  }

  index += `\nTo explore:\n`;
  index += `  cat docs/sections/<slug>.md      - Read a section\n`;
  index += `  ls docs/sections/                - List all section files\n`;
  index += `  grep -r "pattern" docs/sections/ - Search across sections\n`;

  files.push({ path: "docs/sections-index.txt", content: index });

  return files;
}
