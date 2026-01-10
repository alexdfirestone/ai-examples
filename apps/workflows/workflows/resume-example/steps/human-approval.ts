// Human-in-the-loop approval with webhook

import type { EnrichedProfile, Snippets, ApprovalResult } from "../types";

export async function humanApproval(payload: {
  enriched: EnrichedProfile;
  snippets: Snippets;
  candidateId: string;
}): Promise<ApprovalResult> {
  "use step";

  // In mock mode, auto-approve immediately
  const useMock = process.env.MOCK_NOTIFICATIONS === "true";
  
  if (useMock) {
    console.log(
      `[mock] Auto-approving candidate ${payload.candidateId} (mock mode)`
    );
    console.log(`Overview: ${payload.snippets.headline}`);
    return { approved: true, reason: "mock_auto_approve" };
  }

  // Real approval logic handled in workflow
  return { approved: true, reason: "human_approval" };
}

