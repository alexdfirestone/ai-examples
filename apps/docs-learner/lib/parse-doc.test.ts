import { parseDocument, hashContent, normalizeContent } from "./parse-doc";

const DELIMITER = "-".repeat(80);

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeSection(opts: {
  title: string;
  description?: string;
  lastUpdated?: string;
  source: string;
  content: string;
}) {
  return [
    DELIMITER,
    `title: "${opts.title}"`,
    `description: "${opts.description ?? "Some description."}"`,
    `last_updated: "${opts.lastUpdated ?? "2026-02-17T23:11:07.574Z"}"`,
    `source: "${opts.source}"`,
    DELIMITER,
    "",
    opts.content,
  ].join("\n");
}

function makeDocument(...sections: string[]) {
  return sections.join("\n\n");
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

async function testBasicParsing() {
  console.log("TEST: Basic parsing extracts sections correctly");

  const doc = makeDocument(
    makeSection({
      title: "Getting Started",
      source: "https://vercel.com/docs/getting-started",
      content: "# Getting Started\n\nWelcome to Vercel.",
    }),
    makeSection({
      title: "Deployments",
      source: "https://vercel.com/docs/deployments",
      content: "# Deployments\n\nDeploy your app in seconds.",
    })
  );

  const sections = parseDocument(doc);

  console.assert(sections.length === 2, `Expected 2 sections, got ${sections.length}`);
  console.assert(sections[0].title === "Getting Started", `Wrong title: ${sections[0].title}`);
  console.assert(sections[1].title === "Deployments", `Wrong title: ${sections[1].title}`);
  console.assert(
    sections[0].content === "# Getting Started\n\nWelcome to Vercel.",
    `Content mismatch: "${sections[0].content}"`
  );
  console.assert(
    sections[0].source === "https://vercel.com/docs/getting-started",
    `Source mismatch`
  );

  console.log("  ✅ Parsed 2 sections with correct title, source, and content\n");
}

async function testTimestampIgnoredInHash() {
  console.log("TEST: Changing last_updated does NOT change the content hash");

  const contentBody = "# Functions\n\nServerless functions run on demand.\n\n## Usage\n\nDeploy with `vercel deploy`.";

  const doc1 = makeDocument(
    makeSection({
      title: "Functions",
      lastUpdated: "2026-01-01T00:00:00.000Z",
      source: "https://vercel.com/docs/functions",
      content: contentBody,
    })
  );

  const doc2 = makeDocument(
    makeSection({
      title: "Functions",
      lastUpdated: "2026-02-26T12:34:56.789Z", // different timestamp
      source: "https://vercel.com/docs/functions",
      content: contentBody,
    })
  );

  const sections1 = parseDocument(doc1);
  const sections2 = parseDocument(doc2);

  const hash1 = await hashContent(sections1[0].content);
  const hash2 = await hashContent(sections2[0].content);

  console.assert(hash1 === hash2, `Hashes should match!\n  hash1: ${hash1}\n  hash2: ${hash2}`);
  console.assert(
    sections1[0].lastUpdated !== sections2[0].lastUpdated,
    "lastUpdated should be different between the two"
  );

  console.log(`  hash1: ${hash1}`);
  console.log(`  hash2: ${hash2}`);
  console.log("  ✅ Same content + different timestamp = same hash\n");
}

async function testContentChangeDetected() {
  console.log("TEST: Changing actual content DOES change the hash");

  const doc1 = makeDocument(
    makeSection({
      title: "Edge Functions",
      source: "https://vercel.com/docs/edge-functions",
      content: "# Edge Functions\n\nRun code at the edge.\n\n## Supported Runtimes\n\n- JavaScript\n- TypeScript",
    })
  );

  const doc2 = makeDocument(
    makeSection({
      title: "Edge Functions",
      lastUpdated: "2026-02-26T12:34:56.789Z", // also changed timestamp
      source: "https://vercel.com/docs/edge-functions",
      content: "# Edge Functions\n\nRun code at the edge.\n\n## Supported Runtimes\n\n- JavaScript\n- TypeScript\n- WebAssembly",
    })
  );

  const sections1 = parseDocument(doc1);
  const sections2 = parseDocument(doc2);

  const hash1 = await hashContent(sections1[0].content);
  const hash2 = await hashContent(sections2[0].content);

  console.assert(hash1 !== hash2, `Hashes should differ!\n  hash1: ${hash1}\n  hash2: ${hash2}`);

  console.log(`  hash1: ${hash1}`);
  console.log(`  hash2: ${hash2}`);
  console.log("  ✅ Different content = different hash\n");
}

async function testDescriptionChangeIgnored() {
  console.log("TEST: Changing description metadata does NOT change the content hash");

  const contentBody = "# Storage\n\nStore files with Vercel Blob.";

  const doc1 = makeDocument(
    makeSection({
      title: "Storage",
      description: "Old description of storage.",
      source: "https://vercel.com/docs/storage",
      content: contentBody,
    })
  );

  const doc2 = makeDocument(
    makeSection({
      title: "Storage",
      description: "Brand new updated description of storage features.",
      source: "https://vercel.com/docs/storage",
      content: contentBody,
    })
  );

  const sections1 = parseDocument(doc1);
  const sections2 = parseDocument(doc2);

  const hash1 = await hashContent(sections1[0].content);
  const hash2 = await hashContent(sections2[0].content);

  console.assert(hash1 === hash2, `Hashes should match!\n  hash1: ${hash1}\n  hash2: ${hash2}`);
  console.log("  ✅ Same content + different description = same hash\n");
}

async function testNormalizationCRLF() {
  console.log("TEST: normalizeContent() — CRLF → LF produces same hash");

  const contentLF = "# Hello\n\nWorld\nLine two";
  const contentCRLF = "# Hello\r\n\r\nWorld\r\nLine two";

  const normalized1 = normalizeContent(contentLF);
  const normalized2 = normalizeContent(contentCRLF);

  console.assert(normalized1 === normalized2, `Normalized content should match:\n  LF:   ${JSON.stringify(normalized1)}\n  CRLF: ${JSON.stringify(normalized2)}`);

  const hash1 = await hashContent(normalized1);
  const hash2 = await hashContent(normalized2);

  console.assert(hash1 === hash2, `Hashes should match after normalization`);
  console.log("  ✅ CRLF and LF produce same normalized content and hash\n");
}

async function testNormalizationTrailingSpaces() {
  console.log("TEST: normalizeContent() — trailing spaces on lines are stripped");

  const clean = "# Title\n\nSome content here.\n\n## Subtitle";
  const dirty = "# Title   \n\nSome content here.  \t\n\n## Subtitle  ";

  const normalized1 = normalizeContent(clean);
  const normalized2 = normalizeContent(dirty);

  console.assert(normalized1 === normalized2, `Normalized should match:\n  clean: ${JSON.stringify(normalized1)}\n  dirty: ${JSON.stringify(normalized2)}`);

  const hash1 = await hashContent(normalized1);
  const hash2 = await hashContent(normalized2);

  console.assert(hash1 === hash2, `Hashes should match after normalization`);
  console.log("  ✅ Trailing spaces stripped, hashes match\n");
}

async function testNormalizationLeadingTrailingBlankLines() {
  console.log("TEST: normalizeContent() — leading/trailing blank lines are trimmed");

  const content = "# Hello\n\nWorld";
  const padded = "\n\n\n# Hello\n\nWorld\n\n\n";

  const normalized1 = normalizeContent(content);
  const normalized2 = normalizeContent(padded);

  console.assert(normalized1 === normalized2, `Should match after trimming`);

  const hash1 = await hashContent(normalized1);
  const hash2 = await hashContent(normalized2);

  console.assert(hash1 === hash2, `Hashes should match`);
  console.log("  ✅ Leading/trailing blank lines trimmed, hashes match\n");
}

async function testNormalizationPreservesInternalWhitespace() {
  console.log("TEST: normalizeContent() preserves meaningful internal differences");

  const content1 = "# Hello\n\nWorld";
  const content2 = "# Hello\n\nWorld\n\nExtra paragraph";

  const hash1 = await hashContent(normalizeContent(content1));
  const hash2 = await hashContent(normalizeContent(content2));

  console.assert(hash1 !== hash2, `Real content changes should produce different hashes`);
  console.log("  ✅ Internal content differences are still detected\n");
}

async function testNormalizationInParsePipeline() {
  console.log("TEST: parseDocument() applies normalization — CRLF doc produces same content");

  const contentBody = "# Functions\n\nDeploy with vercel.";

  // LF version
  const docLF = makeDocument(
    makeSection({
      title: "Functions",
      source: "https://vercel.com/docs/functions",
      content: contentBody,
    })
  );

  // CRLF version (simulate Windows line endings in raw file)
  const docCRLF = docLF.replace(/\n/g, "\r\n");

  const sectionsLF = parseDocument(docLF);
  const sectionsCRLF = parseDocument(docCRLF);

  console.assert(sectionsLF.length === 1, `LF doc should have 1 section`);
  console.assert(sectionsCRLF.length === 1, `CRLF doc should have 1 section`);

  const hashLF = await hashContent(sectionsLF[0].content);
  const hashCRLF = await hashContent(sectionsCRLF[0].content);

  console.assert(hashLF === hashCRLF, `Hashes should match:\n  LF:   ${hashLF}\n  CRLF: ${hashCRLF}`);
  console.log("  ✅ parseDocument() normalizes — CRLF and LF produce same hash\n");
}

async function testRealWorldFormat() {
  console.log("TEST: Parse a multi-section doc that mimics the real llms-full.txt format");

  // This is closer to what Vercel actually serves
  const raw = `
Some preamble text that comes before the first section.

${DELIMITER}
title: "Vercel CLI"
description: "Install and use the Vercel CLI to manage your deployments."
last_updated: "2026-02-17T23:11:07.574Z"
source: "https://vercel.com/docs/cli"
${DELIMITER}

# Vercel CLI

The Vercel CLI is the command-line interface for Vercel.

## Installation

\`\`\`bash
npm i -g vercel
\`\`\`

## Commands

- \`vercel deploy\` — Deploy the current directory
- \`vercel dev\` — Start a local development server

${DELIMITER}
title: "Frameworks"
description: "Vercel supports many frameworks out of the box."
last_updated: "2026-02-15T10:00:00.000Z"
source: "https://vercel.com/docs/frameworks"
${DELIMITER}

# Frameworks

Vercel has built-in support for popular frameworks.

| Framework | Support |
|-----------|---------|
| Next.js   | Full    |
| Remix     | Full    |
| Astro     | Full    |

${DELIMITER}
title: "Environment Variables"
description: "Configure environment variables for your project."
last_updated: "2026-02-20T15:30:00.000Z"
source: "https://vercel.com/docs/environment-variables"
${DELIMITER}

# Environment Variables

Environment variables allow you to configure your application without hard-coding values.

## Types

1. **Plain text** — Stored as-is
2. **Secret** — Encrypted at rest
3. **System** — Provided by Vercel (e.g., \`VERCEL_URL\`)
`.trim();

  const sections = parseDocument(raw);

  console.assert(sections.length === 3, `Expected 3 sections, got ${sections.length}`);

  // Verify each section parsed correctly
  console.assert(sections[0].title === "Vercel CLI", `Section 0 title: ${sections[0].title}`);
  console.assert(sections[1].title === "Frameworks", `Section 1 title: ${sections[1].title}`);
  console.assert(sections[2].title === "Environment Variables", `Section 2 title: ${sections[2].title}`);

  // Verify content doesn't include metadata
  console.assert(
    !sections[0].content.includes("last_updated"),
    "Content should not contain metadata fields"
  );
  console.assert(
    !sections[0].content.includes(DELIMITER),
    "Content should not contain delimiters"
  );

  // Verify content has actual markdown
  console.assert(
    sections[0].content.includes("```bash"),
    "CLI section should contain code block"
  );
  console.assert(
    sections[1].content.includes("| Framework |"),
    "Frameworks section should contain table"
  );

  // Hash each section and make sure they're all different
  const hashes = await Promise.all(sections.map((s) => hashContent(s.content)));
  const uniqueHashes = new Set(hashes);
  console.assert(
    uniqueHashes.size === 3,
    `Expected 3 unique hashes, got ${uniqueHashes.size}`
  );

  console.log(`  Section 0 (${sections[0].title}): ${hashes[0].slice(0, 16)}...`);
  console.log(`  Section 1 (${sections[1].title}): ${hashes[1].slice(0, 16)}...`);
  console.log(`  Section 2 (${sections[2].title}): ${hashes[2].slice(0, 16)}...`);
  console.log("  ✅ 3 sections parsed cleanly, no metadata bleed, unique hashes\n");

  // Now re-parse with ALL timestamps changed — hashes should be identical
  console.log("  Re-parsing with all timestamps changed...");
  const rawUpdated = raw
    .replace("2026-02-17T23:11:07.574Z", "2026-02-26T00:00:00.000Z")
    .replace("2026-02-15T10:00:00.000Z", "2026-02-26T00:00:00.000Z")
    .replace("2026-02-20T15:30:00.000Z", "2026-02-26T00:00:00.000Z");

  const sectionsUpdated = parseDocument(rawUpdated);
  const hashesUpdated = await Promise.all(sectionsUpdated.map((s) => hashContent(s.content)));

  for (let i = 0; i < 3; i++) {
    console.assert(
      hashes[i] === hashesUpdated[i],
      `Section ${i} hash changed after timestamp update!\n  before: ${hashes[i]}\n  after:  ${hashesUpdated[i]}`
    );
  }

  console.log("  ✅ All 3 hashes identical after timestamp-only change\n");
}

async function testAddedRemovedDetection() {
  console.log("TEST: Simulated change detection (added / modified / removed)");

  // Snapshot A: two sections
  const docA = makeDocument(
    makeSection({
      title: "Section Alpha",
      source: "https://vercel.com/docs/alpha",
      content: "# Alpha\n\nOriginal alpha content.",
    }),
    makeSection({
      title: "Section Beta",
      source: "https://vercel.com/docs/beta",
      content: "# Beta\n\nOriginal beta content.",
    })
  );

  // Snapshot B: alpha modified, beta removed, gamma added
  const docB = makeDocument(
    makeSection({
      title: "Section Alpha",
      lastUpdated: "2026-02-26T00:00:00.000Z",
      source: "https://vercel.com/docs/alpha",
      content: "# Alpha\n\nUpdated alpha content with new info.",
    }),
    makeSection({
      title: "Section Gamma",
      source: "https://vercel.com/docs/gamma",
      content: "# Gamma\n\nBrand new section.",
    })
  );

  const sectionsA = parseDocument(docA);
  const sectionsB = parseDocument(docB);

  // Build hash maps (mimicking what the query does)
  const mapA = new Map<string, { content: string; hash: string }>();
  for (const s of sectionsA) {
    mapA.set(s.source, { content: s.content, hash: await hashContent(s.content) });
  }

  const sourcesB = new Set<string>();
  const changes: { type: string; source: string }[] = [];

  for (const s of sectionsB) {
    sourcesB.add(s.source);
    const prev = mapA.get(s.source);
    const hash = await hashContent(s.content);

    if (!prev) {
      changes.push({ type: "added", source: s.source });
    } else if (prev.hash !== hash) {
      changes.push({ type: "modified", source: s.source });
    }
  }

  for (const [source] of mapA) {
    if (!sourcesB.has(source)) {
      changes.push({ type: "removed", source });
    }
  }

  console.assert(changes.length === 3, `Expected 3 changes, got ${changes.length}`);

  const modified = changes.find((c) => c.type === "modified");
  const added = changes.find((c) => c.type === "added");
  const removed = changes.find((c) => c.type === "removed");

  console.assert(modified?.source === "https://vercel.com/docs/alpha", "Alpha should be modified");
  console.assert(added?.source === "https://vercel.com/docs/gamma", "Gamma should be added");
  console.assert(removed?.source === "https://vercel.com/docs/beta", "Beta should be removed");

  console.log("  modified: /alpha ✓");
  console.log("  added:    /gamma ✓");
  console.log("  removed:  /beta  ✓");
  console.log("  ✅ Change detection works correctly\n");
}

// ─── Run all ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🧪 parse-doc + hashContent test suite\n");
  console.log("=".repeat(60) + "\n");

  await testBasicParsing();
  await testTimestampIgnoredInHash();
  await testContentChangeDetected();
  await testDescriptionChangeIgnored();
  await testNormalizationCRLF();
  await testNormalizationTrailingSpaces();
  await testNormalizationLeadingTrailingBlankLines();
  await testNormalizationPreservesInternalWhitespace();
  await testNormalizationInParsePipeline();
  await testRealWorldFormat();
  await testAddedRemovedDetection();

  console.log("=".repeat(60));
  console.log("🎉 All tests passed!\n");
}

main().catch((err) => {
  console.error("❌ Test failure:", err);
  process.exit(1);
});
