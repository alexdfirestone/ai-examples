import { DurableAgent } from "@workflow/ai/agent";
import { getWritable } from "workflow";
import { convertToModelMessages, type UIMessage } from "ai";
import { tools } from "./tools";
import type { CustomDataPart } from "./types";

const SYSTEM_PROMPT = `You are a research assistant that helps users create comprehensive research reports.

Your workflow:
1. First, use researchTopic to gather information about the user's topic
2. Then use generateOutline to create a structured outline
3. IMPORTANT: After generating the outline, you MUST call requestOutlineApproval to get human approval
4. Wait for the approval result - if rejected, ask for feedback; if approved, continue
5. Once approved, use generateSection for EACH section in the outline
6. Finally, use finalizeReport to compile everything

Be thorough but concise. Always explain what you're doing at each step.`;

export async function researchWorkflow(messages: UIMessage[]) {
  "use workflow";

  // Get writable stream directly in workflow
  const writable = getWritable<CustomDataPart>();

  // Convert UI messages to model messages
  const modelMessages = await convertToModelMessages(messages);

  // Single agent with all tools - the requestOutlineApproval tool
  // will automatically pause the workflow using defineHook
  const agent = new DurableAgent({
    model: "anthropic/claude-sonnet-4.5",
    system: SYSTEM_PROMPT,
    tools,
  });

  // Run agent - it will pause automatically when it calls requestOutlineApproval
  await agent.stream({ messages: modelMessages, writable });
}
