import { streamText, convertToModelMessages, UIMessage, stepCountIs } from 'ai';
import { after } from 'next/server';
import { tools } from './ai/tools';
import { observe, updateActiveObservation, updateActiveTrace } from '@langfuse/tracing';
import { trace } from '@opentelemetry/api';
import { langfuseSpanProcessor } from '@/instrumentation';

const handler = async (request: Request) => {
  const { messages, model }: { messages: UIMessage[]; model?: string } = await request.json();

  // Demo error trigger
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.parts?.some((part: any) => part.type === 'text' && part.text === 'TRIGGER_ERROR_DEMO')) {
    throw new Error('Demo error triggered');
  }

  // Use provided model or default to claude-sonnet-4.5
  const selectedModel = model || 'anthropic/claude-sonnet-4.5';

  // Extract input text for tracing
  const textPart = lastMessage?.parts?.find((part: any) => part.type === 'text') as any;
  const inputText = textPart?.text as string | undefined;

  // Add metadata to the trace
  updateActiveObservation({
    input: inputText,
    metadata: {
      model: selectedModel,
      messageCount: messages.length,
    },
  });

  updateActiveTrace({
    name: 'chat-message',
    input: inputText,
    metadata: {
      model: selectedModel,
    },
  });

  const result = streamText({
    model: selectedModel as any,
    system: 'You are a friendly assistant!',
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: tools as any,
    providerOptions: {
      openai: {
        reasoningEffort: 'low', // Increases autonomous exploration
      },
    },
    experimental_telemetry: { isEnabled: true },
    onFinish: async (result) => {
      // Update trace with final output after stream completes
      updateActiveObservation({
        output: result.text,
        metadata: {
          finishReason: result.finishReason,
          usage: result.usage,
          toolCalls: result.toolCalls?.length || 0,
        },
      });
      updateActiveTrace({
        output: result.text,
      });

      // End span manually after stream has finished
      trace.getActiveSpan()?.end();
    },
    onError: async (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      updateActiveObservation({
        output: errorMessage,
        level: 'ERROR',
      });
      updateActiveTrace({
        output: errorMessage,
      });

      // Manually end the span since we're streaming
      trace.getActiveSpan()?.end();
    },
  });

  // Critical for serverless: flush traces before function terminates
  after(async () => await langfuseSpanProcessor.forceFlush());

  return result.toUIMessageStreamResponse();
};

// Wrap handler with observe() to create a Langfuse trace
export const POST = observe(handler, {
  name: 'handle-chat-message',
  endOnExit: false, // Don't end observation until stream finishes
});