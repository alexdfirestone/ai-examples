// Human-in-the-loop approval with webhook

import type { EnrichedProfile, Snippets, ApprovalResult } from "../types";

export async function humanApproval(payload: {
  enriched: EnrichedProfile;
  snippets: Snippets;
  candidateId: string;
  webhookUrl?: string;
}): Promise<ApprovalResult> {
  "use step";

  // In mock mode, auto-approve immediately
  const useMock = process.env.MOCK_NOTIFICATIONS !== "false";
  
  if (useMock) {
    console.log(
      `[mock] Auto-approving candidate ${payload.candidateId} (mock mode)`
    );
    console.log(`Overview: ${payload.snippets.headline}`);
    return { approved: true, reason: "mock_auto_approve" };
  }

  // Real implementation would:
  // 1. Send notification with webhook URL (passed from workflow)
  // 2. Wait for webhook response or timeout
  // For now, just auto-approve
  return { approved: true, reason: "auto_approve" };
}

