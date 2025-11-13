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
import { streamWorkflowUpdates } from "./steps/stream-update";

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
    await streamWorkflowUpdates(writable, [
      { step: "workflow", status: "started", data: { candidateId: input.candidateId } }
    ]);

    // 1) Validate input
    await streamWorkflowUpdates(writable, [{ step: "validate", status: "running" }]);
    const normalized = await validateInput(input);
    await streamWorkflowUpdates(writable, [{ step: "validate", status: "completed" }]);

    // 2) Ingest raw sources (mocked for POC)
    await streamWorkflowUpdates(writable, [{ step: "ingest", status: "running" }]);
    const raw = await ingestSources(normalized);
    await streamWorkflowUpdates(writable, [{ 
      step: "ingest", 
      status: "completed", 
      data: { 
        hasResume: !!raw.resumeText,
        hasLinkedIn: !!raw.linkedInHtml,
        hasGitHub: !!raw.githubReadme
      }
    }]);

    // 3) Extract and normalize text
    await streamWorkflowUpdates(writable, [{ step: "extract", status: "running" }]);
    const extracted = await extractAndNormalize(raw);
    await streamWorkflowUpdates(writable, [{ 
      step: "extract", 
      status: "completed", 
      data: { tokens: extracted.tokens }
    }]);

    // 4) Agent enriches, scores, and identifies gaps
    await streamWorkflowUpdates(writable, [{ step: "agent-enrich", status: "running" }]);
    const enriched = await agentEnrichProfile({
      extracted,
      jobContext: normalized.jobContext,
    });
    await streamWorkflowUpdates(writable, [{ 
      step: "agent-enrich", 
      status: "completed", 
      data: { 
        score: enriched.overallScore,
        gaps: enriched.gaps.length,
        riskFlags: enriched.riskFlags.length
      }
    }]);

    // 5) Generate recruiter-facing snippets
    await streamWorkflowUpdates(writable, [{ step: "generate-snippets", status: "running" }]);
    const snippets = await generateSnippets(enriched);
    await streamWorkflowUpdates(writable, [{ step: "generate-snippets", status: "completed" }]);

    // 6) Human-in-the-loop approval (COMMENTED OUT FOR NOW)
    const approval = { approved: true, reason: "auto_approved" };

    // 7) Persist profile to database
    await streamWorkflowUpdates(writable, [{ step: "persist", status: "running" }]);
    await persistProfile({
      enriched,
      snippets,
      approved: approval.approved,
      candidateId: normalized.candidateId,
    });
    await streamWorkflowUpdates(writable, [{ step: "persist", status: "completed" }]);

    // 8) Notify downstream teams
    await streamWorkflowUpdates(writable, [{ step: "notify", status: "running" }]);
    await notifyTeams({
      candidateId: normalized.candidateId,
      approved: approval.approved,
    });
    await streamWorkflowUpdates(writable, [{ step: "notify", status: "completed" }]);

    const result: WorkflowResult = {
      status: "completed",
      candidateId: normalized.candidateId,
      approved: approval.approved,
      enriched,
      snippets,
    };

    await streamWorkflowUpdates(writable, [{ step: "workflow", status: "completed", data: result }]);

    return result;
  } catch (error) {
    console.error(`[workflow] Error processing candidate:`, error);
    await streamWorkflowUpdates(writable, [{ 
      step: "workflow", 
      status: "error", 
      data: { message: error instanceof Error ? error.message : "Unknown error" }
    }]);

    return {
      status: "failed",
      candidateId: input.candidateId,
      approved: false,
    };
  }
}

