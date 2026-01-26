import { streamText, convertToModelMessages, UIMessage, stepCountIs } from 'ai';
import { after } from 'next/server';
import { createPlannerTools, getRecitationCount, resetRecitationCount, syncScheduleToSandbox } from './tools';
import type { ScheduleState } from './tools';
import { generateSystemPrompt } from './prompt';
import { observe, updateActiveObservation, updateActiveTrace } from '@langfuse/tracing';
import { trace } from '@opentelemetry/api';
import { langfuseSpanProcessor } from '@/instrumentation';

// Dynamic import for @vercel/sandbox - allows TS to compile before package is installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Sandbox: any;

async function loadSandbox() {
  if (!Sandbox) {
    const module = await import('@vercel/sandbox');
    Sandbox = module.Sandbox;
  }
  return Sandbox;
}

// Store sandbox instance for reuse within a session
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sandboxInstance: any = null;
let sandboxCreatedAt: number = 0;
const SANDBOX_TTL = 5 * 60 * 1000; // 5 minutes

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSandbox(): Promise<any> {
  const now = Date.now();
  
  // Reuse existing sandbox if still fresh
  if (sandboxInstance && (now - sandboxCreatedAt) < SANDBOX_TTL) {
    return sandboxInstance;
  }

  // Load Sandbox class dynamically
  const SandboxClass = await loadSandbox();

  // Create new sandbox
  console.log('Creating new sandbox instance for schedule planner...');
  sandboxInstance = await SandboxClass.create({
    timeout: 5 * 60 * 1000, // 5 minute timeout
  });

  // Initialize research directory
  await sandboxInstance.runCommand('mkdir', ['-p', 'research']);

  sandboxCreatedAt = now;
  console.log('Sandbox created with research/ directory');
  
  return sandboxInstance;
}

const handler = async (request: Request) => {
  const { messages, resetSandbox }: { messages: UIMessage[]; resetSandbox?: boolean } = await request.json();

  // Reset sandbox if requested
  if (resetSandbox) {
    sandboxInstance = null;
    resetRecitationCount();
  }

  // Reset recitation count for new conversations
  if (messages.length <= 1) {
    resetRecitationCount();
  }

  // Extract the latest schedule state from the last user message metadata
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  const clientState = (lastUserMessage?.metadata as any)?.scheduleState;
  const userTimezone = (lastUserMessage?.metadata as any)?.timezone;

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

  // Get sandbox instance
  const sandbox = await getSandbox();

  // Sync initial schedule state to sandbox as read-only reference
  // This allows the agent to read schedule.json via bash commands
  await syncScheduleToSandbox(sandbox, state);

  // Create tools with sandbox and state bound
  const tools = createPlannerTools(sandbox, state);

  const result = streamText({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: 'openai/gpt-5-mini' as any,
    system: generateSystemPrompt(userTimezone),
    messages: convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(50), // Allow many steps for recitation pattern
    onFinish: async (result) => {
      // Update trace with final output after stream completes
      const lastMessageParts = result.response.messages?.[result.response.messages.length - 1];
      const outputText = typeof lastMessageParts?.content === 'string' 
        ? lastMessageParts.content 
        : undefined;
      
      console.log(`
========== SCHEDULE PLANNER COMPLETE ==========
Total Steps: ${result.steps.length}
Tool Calls: ${result.toolCalls?.length || 0}
Recitation Count: ${getRecitationCount()}
Finish Reason: ${result.finishReason}
===============================================
      `);

      updateActiveObservation({
        output: outputText,
        metadata: {
          messageCount: result.response.messages?.length || 0,
          recitationCount: getRecitationCount(),
          totalSteps: result.steps.length,
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
    },
  });

  // Critical for serverless: flush traces before function terminates
  after(async () => await langfuseSpanProcessor.forceFlush());

  return result.toUIMessageStreamResponse();
};

// Wrap handler with observe() to create a Langfuse trace
export const POST = observe(handler, {
  name: 'handle-schedule-planner',
  endOnExit: false, // Don't end observation until stream finishes
});
