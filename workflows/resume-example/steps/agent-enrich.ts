// Agent enrichment step with tools

import type {
  ExtractedData,
  EnrichedProfile,
  CandidateInput,
  CanonicalProfile,
  ToolCall,
} from "../types";
import { extractCanonicalProfile } from "../utils/llm";
import { webSearch } from "../tools/web-search";
import { schemaCheck } from "../tools/schema-check";
import { scoreWithRubric } from "../tools/score-rubric";
import { writeStreamUpdate } from "./stream-writer";

export async function agentEnrichProfile(args: {
  extracted: ExtractedData;
  jobContext?: CandidateInput["jobContext"];
  writable?: WritableStream;
}): Promise<EnrichedProfile> {
  "use step";

  const { text, tokens } = args.extracted;
  const toolCalls: ToolCall[] = [];

  console.log(`[agent] Processing ${tokens} tokens of candidate data`);

  // Step 1: Extract canonical profile using LLM
  const tool1 = {
    name: "extractCanonicalProfile",
    description: "Extract structured profile from resume text using LLM",
    timestamp: Date.now(),
  };
  toolCalls.push(tool1);
  if (args.writable) {
    await writeStreamUpdate(args.writable, {
      step: "agent-enrich",
      status: "tool-call",
      data: { toolCalls },
      timestamp: Date.now(),
    });
  }
  
  let canonical = await extractCanonicalProfile(text);

  // Step 2: Validate schema
  const tool2 = {
    name: "schemaCheck",
    description: "Validate profile matches expected schema",
    timestamp: Date.now(),
  };
  toolCalls.push(tool2);
  if (args.writable) {
    await writeStreamUpdate(args.writable, {
      step: "agent-enrich",
      status: "tool-call",
      data: { toolCalls },
      timestamp: Date.now(),
    });
  }
  
  await schemaCheck(canonical);

  // Step 3: Identify gaps
  const initialGaps = findGaps(canonical);
  console.log(`[agent] Found ${initialGaps.length} gaps:`, initialGaps);

  // Step 4: If gaps exist, do web search to try to fill them
  let filledCanonical = { ...canonical };
  if (initialGaps.length > 0) {
    const searchQuery = buildGapQuery(initialGaps, canonical);
    console.log(`[agent] Searching for: ${searchQuery}`);

    const tool3 = {
      name: "webSearch",
      description: `Search for missing information: ${initialGaps.join(", ")}`,
      timestamp: Date.now(),
    };
    toolCalls.push(tool3);
    if (args.writable) {
      await writeStreamUpdate(args.writable, {
        step: "agent-enrich",
        status: "tool-call",
        data: { toolCalls },
        timestamp: Date.now(),
      });
    }

    const searchResults = await webSearch({ query: searchQuery });
    filledCanonical = tryFillFromSearch(canonical, searchResults);

    console.log(
      `[agent] After search, remaining gaps: ${findGaps(filledCanonical).length}`
    );
  }

  // Step 5: Score against rubric
  const tool4 = {
    name: "scoreWithRubric",
    description: "Evaluate candidate against job requirements",
    timestamp: Date.now(),
  };
  toolCalls.push(tool4);
  if (args.writable) {
    await writeStreamUpdate(args.writable, {
      step: "agent-enrich",
      status: "tool-call",
      data: { toolCalls },
      timestamp: Date.now(),
    });
  }
  
  const scoringResult = await scoreWithRubric({
    canonical: filledCanonical,
    job: args.jobContext,
  });

  return {
    canonical: filledCanonical,
    gaps: findGaps(filledCanonical),
    riskFlags: scoringResult.riskFlags,
    overallScore: scoringResult.score,
    rationale: scoringResult.rationale,
  };
}

// Helper functions
function findGaps(canonical: CanonicalProfile): string[] {
  const gaps: string[] = [];

  if (!canonical.emails || canonical.emails.length === 0) {
    gaps.push("email");
  }

  if (!canonical.skills || canonical.skills.length === 0) {
    gaps.push("skills");
  }

  if (!canonical.experience || canonical.experience.length === 0) {
    gaps.push("experience");
  }

  if (!canonical.location) {
    gaps.push("location");
  }

  if (!canonical.education || canonical.education.length === 0) {
    gaps.push("education");
  }

  return gaps;
}

function buildGapQuery(gaps: string[], canonical: CanonicalProfile): string {
  const name = canonical.name || "candidate";
  return `${name} ${gaps.join(" ")} professional profile`;
}

function tryFillFromSearch(
  canonical: CanonicalProfile,
  results: Array<{ title: string; url: string; snippet: string }>
): CanonicalProfile {
  const out = { ...canonical };

  // Ensure urls array exists
  if (!out.urls) out.urls = [];

  // Add URLs from search results
  results.forEach((r) => {
    if (!out.urls!.includes(r.url)) {
      out.urls!.push(r.url);
    }
  });

  return out;
}

