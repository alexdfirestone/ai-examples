import { ToolLoopAgent, createAgentUIStreamResponse, type UIMessage } from 'ai';
import { after } from 'next/server';
import { tools } from './tools';
import type { ScheduleState } from './tools';
import { generateSystemPrompt } from './prompt';
import { observe, updateActiveObservation, updateActiveTrace } from '@langfuse/tracing';
import { trace } from '@opentelemetry/api';
import { langfuseSpanProcessor } from '@/instrumentation';

const handler = async (request: Request) => {
  const { messages }: { messages: UIMessage[] } = await request.json();

  // Extract the latest schedule state from the last user message metadata
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  const clientState = (lastUserMessage?.metadata as any)?.scheduleState;

  // Initialize state from client or use empty state
  const state: ScheduleState = clientState || {
    window: {},
    blocks: []
  };

  // Extract input text for tracing
  const textPart = lastUserMessage?.parts?.find((part: any) => part.type === 'text') as any;
  const inputText = textPart?.text as string | undefined;

  // Add metadata to the trace
  updateActiveObservation({
    input: inputText,
    metadata: {
      model: 'openai/gpt-5-mini',
      messageCount: messages.length,
      scheduleBlockCount: state.blocks.length,
      hasTimeWindow: !!(state.window.start && state.window.end),
    },
  });

  updateActiveTrace({
    name: 'schedule-planner',
    input: inputText,
    metadata: {
      model: 'openai/gpt-5-mini',
      scheduleState: state,
    },
  });

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
    experimental_telemetry: { isEnabled: true },
  });

  // Use the agent to generate a response
  const response = createAgentUIStreamResponse({
    agent: schedulePlannerAgent,
    messages,
    onFinish: async (result) => {
      // Update trace with final output after stream completes
      const lastMessageParts = result.messages?.[result.messages.length - 1]?.parts;
      const outputTextPart = lastMessageParts?.find((part: any) => part.type === 'text') as any;
      const outputText = outputTextPart?.text as string | undefined;
      
      updateActiveObservation({
        output: outputText,
        metadata: {
          messageCount: result.messages?.length || 0,
        },
      });
      updateActiveTrace({
        output: outputText,
      });

      // End span manually after stream has finished
      trace.getActiveSpan()?.end();
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      updateActiveObservation({
        output: errorMessage,
        level: 'ERROR',
      });
      updateActiveTrace({
        output: errorMessage,
      });

      // Manually end the span
      trace.getActiveSpan()?.end();
      
      return errorMessage;
    },
  });

  // Critical for serverless: flush traces before function terminates
  after(async () => await langfuseSpanProcessor.forceFlush());

  return response;
};

// Wrap handler with observe() to create a Langfuse trace
export const POST = observe(handler, {
  name: 'handle-schedule-planner',
  endOnExit: false, // Don't end observation until stream finishes
});

