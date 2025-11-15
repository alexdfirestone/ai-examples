import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, UIMessage, stepCountIs } from 'ai';
import { tools } from './ai/tools';


export async function POST(request: Request) {
  const { messages, model }: { messages: UIMessage[]; model?: string } = await request.json();

  // Demo error trigger
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.parts?.some((part: any) => part.type === 'text' && part.text === 'TRIGGER_ERROR_DEMO')) {
    throw new Error('Demo error triggered');
  }

  // Use provided model or default to claude-sonnet-4.5
  const selectedModel = model || 'anthropic/claude-sonnet-4.5';

  const result = streamText({
    model: selectedModel,
    system: 'You are a friendly assistant!',
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools,
  });

  return result.toUIMessageStreamResponse();
}