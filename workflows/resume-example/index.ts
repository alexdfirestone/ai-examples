// Resume Review Workflow Orchestrator
// Proof-of-concept for a resume-review product using Vercel Workflows

import { getWritable } from "workflow";
import type { CandidateInput, WorkflowResult } from "./types";
import { validateInput } from "./steps/validate";
import { ingestSources } from "./steps/ingest";
import { extractAndNormalize } from "./steps/extract";
import { agentEnrichProfile } from "./steps/agent-enrich";
import { generateSnippets } from "./steps/generate-snippets";
// import { humanApproval } from "./steps/human-approval"; // Commented out for now
import { persistProfile } from "./steps/persist";
import { notifyTeams } from "./steps/notify";
import { writeStreamUpdate } from "./steps/stream-writer";

/**
 * Main workflow orchestrator for resume review process
 * 
 * Process:
 * 1. Validate input
 * 2. Ingest raw sources (resume, LinkedIn, GitHub)
 * 3. Extract and normalize text
 * 4. Agent enriches profile with AI and tools
 * 5. Generate recruiter-facing snippets
 * 6. Persist profile to database
 * 7. Notify downstream teams
 */
export async function reviewCandidateProfile(
  input: CandidateInput
): Promise<WorkflowResult> {
  "use workflow";

  // Get writable stream to send updates to client
  const writable = getWritable();

  try {
    // Send initial update
    await writeStreamUpdate(writable, { 
      step: "workflow", 
      status: "started", 
      data: { candidateId: input.candidateId },
      timestamp: Date.now()
    });

    // 1) Validate input
    await writeStreamUpdate(writable, { step: "validate", status: "running", timestamp: Date.now() });
    const normalized = await validateInput(input);
    await writeStreamUpdate(writable, { step: "validate", status: "completed", timestamp: Date.now() });

    // 2) Ingest raw sources (mocked for POC)
    await writeStreamUpdate(writable, { step: "ingest", status: "running", timestamp: Date.now() });
    const raw = await ingestSources(normalized, writable);
    await writeStreamUpdate(writable, { 
      step: "ingest", 
      status: "completed", 
      data: { 
        hasResume: !!raw.resumeText,
        hasLinkedIn: !!raw.linkedInHtml,
        hasGitHub: !!raw.githubReadme
      },
      timestamp: Date.now()
    });

    // 3) Extract and normalize text
    await writeStreamUpdate(writable, { step: "extract", status: "running", timestamp: Date.now() });
    const extracted = await extractAndNormalize(raw, writable);
    await writeStreamUpdate(writable, { 
      step: "extract", 
      status: "completed", 
      data: { tokens: extracted.tokens },
      timestamp: Date.now()
    });

    // 4) Agent enriches, scores, and identifies gaps
    await writeStreamUpdate(writable, { step: "agent-enrich", status: "running", timestamp: Date.now() });
    const enriched = await agentEnrichProfile({
      extracted,
      jobContext: normalized.jobContext,
      writable,
    });
    await writeStreamUpdate(writable, { 
      step: "agent-enrich", 
      status: "completed", 
      data: { 
        score: enriched.overallScore,
        gaps: enriched.gaps.length,
        riskFlags: enriched.riskFlags.length
      },
      timestamp: Date.now()
    });

    // 5) Generate recruiter-facing snippets
    await writeStreamUpdate(writable, { step: "generate-snippets", status: "running", timestamp: Date.now() });
    const snippets = await generateSnippets(enriched, writable);
    await writeStreamUpdate(writable, { step: "generate-snippets", status: "completed", timestamp: Date.now() });

    // 6) Human-in-the-loop approval (COMMENTED OUT FOR NOW)
    const approval = { approved: true, reason: "auto_approved" };

    // 7) Persist profile to database
    await writeStreamUpdate(writable, { step: "persist", status: "running", timestamp: Date.now() });
    await persistProfile({
      enriched,
      snippets,
      approved: approval.approved,
      candidateId: normalized.candidateId,
    });
    await writeStreamUpdate(writable, { step: "persist", status: "completed", timestamp: Date.now() });

    // 8) Notify downstream teams
    await writeStreamUpdate(writable, { step: "notify", status: "running", timestamp: Date.now() });
    await notifyTeams({
      candidateId: normalized.candidateId,
      approved: approval.approved,
    });
    await writeStreamUpdate(writable, { step: "notify", status: "completed", timestamp: Date.now() });

    const result: WorkflowResult = {
      status: "completed",
      candidateId: normalized.candidateId,
      approved: approval.approved,
      enriched,
      snippets,
    };

    await writeStreamUpdate(writable, { step: "workflow", status: "completed", data: result, timestamp: Date.now() });

    // Stream is automatically closed when workflow returns
    return result;
  } catch (error) {
    console.error(`[workflow] Error processing candidate:`, error);
    await writeStreamUpdate(writable, { 
      step: "workflow", 
      status: "error", 
      data: { message: error instanceof Error ? error.message : "Unknown error" },
      timestamp: Date.now()
    });

    // Stream is automatically closed when workflow returns
    return {
      status: "failed",
      candidateId: input.candidateId,
      approved: false,
    };
  }
}

