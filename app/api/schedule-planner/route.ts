import { ToolLoopAgent, createAgentUIStreamResponse, type UIMessage } from 'ai';
import { tools } from './tools';
import type { ScheduleState } from './tools';
import { generateSystemPrompt } from './prompt';

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  // Extract the latest schedule state from the last user message metadata
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  const clientState = (lastUserMessage?.metadata as any)?.scheduleState;

  // Initialize state from client or use empty state
  const state: ScheduleState = clientState || {
    window: {},
    blocks: []
  };

  // Bind state to each tool function
  const toolsWithState = {
    ask_followup: tools.ask_followup,
    web_search: tools.web_search,
    mutate_timeline: {
      ...tools.mutate_timeline,
      execute: tools.mutate_timeline.execute?.bind({ state })
    },
    mutate_blocks: {
      ...tools.mutate_blocks,
      execute: tools.mutate_blocks.execute?.bind({ state })
    }
  };

  // Create the agent with the bound tools
  const schedulePlannerAgent = new ToolLoopAgent({
    model: 'openai/gpt-5-mini',
    instructions: generateSystemPrompt(),
    tools: toolsWithState as any,
  });

  // Use the agent to generate a response
  return createAgentUIStreamResponse({
    agent: schedulePlannerAgent,
    messages,
  });
}

