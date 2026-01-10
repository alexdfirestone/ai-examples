import { DurableAgent } from "@workflow/ai/agent";
import { getWritable, createWebhook } from "workflow";
import { convertToModelMessages, type UIMessage } from "ai";
import { tools } from "./tools";
import type { CustomDataPart } from "./types";

const SYSTEM_PROMPT = `You are a research assistant that helps users create comprehensive research reports.

Your workflow:
1. First, use researchTopic to gather information about the user's topic
2. Then use generateOutline to create a structured outline
3. After showing the outline, ALWAYS inform the user they need to approve it before continuing
4. Wait for explicit approval before proceeding
5. Once approved, use generateSection for EACH section in the outline
6. Finally, use finalizeReport to compile everything

Be thorough but concise. Always explain what you're doing at each step.`;

// Step function to send approval request - getWriter() must be in step context
async function sendApprovalRequest(webhookToken: string) {
  "use step";
  const writer = getWritable<CustomDataPart>().getWriter();
  try {
    await writer.write({
      type: "data-approval-request",
      id: "approval",
      data: {
        message: "Please review the outline above and approve to continue.",
        webhookUrl: `/api/chat/approve?token=${webhookToken}`,
      },
    });
  } finally {
    writer.releaseLock();
  }
}

// Step function to send rejection message - getWriter() must be in step context
async function sendRejectionMessage() {
  "use step";
  const writer = getWritable().getWriter();
  try {
    await writer.write({
      type: "text-delta",
      textDelta: "Outline was not approved. Please provide feedback on what you'd like changed, and I'll revise it.",
    });
  } finally {
    writer.releaseLock();
  }
}

export async function researchWorkflow(messages: UIMessage[]) {
  "use workflow";

  // Get writable stream directly in workflow (per documentation)
  const writable = getWritable<CustomDataPart>();

  // Create webhook for approval at workflow level
  const approvalWebhook = createWebhook();

  // Create DurableAgent directly in workflow (NOT wrapped in a step)
  const agent = new DurableAgent({
    model: "anthropic/claude-sonnet-4.5",
    system: SYSTEM_PROMPT,
    tools,
  });

  // Convert UI messages to model messages
  const modelMessages = await convertToModelMessages(messages);

  // Run agent - DurableAgent manages its own steps internally
  await agent.stream({ messages: modelMessages, writable });

  // Send approval request from step context
  await sendApprovalRequest(approvalWebhook.token);

  // Wait for approval (webhook will be called from the UI)
  const approvalRequest = await approvalWebhook;
  const approvalData = await approvalRequest.json();

  if (!approvalData.approved) {
    // Send rejection message from step context
    await sendRejectionMessage();
    return;
  }

  // If approved, continue with the agent to generate sections
  // Use ModelMessage format directly for continuation
  const continueMessages = [
    ...modelMessages,
    {
      role: "assistant" as const,
      content: "I've received approval for the outline. I'll now generate each section of the report.",
    },
    {
      role: "user" as const,
      content: "Yes, the outline is approved. Please proceed with generating all sections and then finalize the report.",
    },
  ];

  // Run agent again with continuation messages
  await agent.stream({ messages: continueMessages, writable });
}
