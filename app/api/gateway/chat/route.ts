import { gateway } from '@ai-sdk/gateway';
import { streamText, convertToModelMessages } from 'ai';

export async function POST(req: Request) {
  try {
    const { messages, modelId, providerOptions } = await req.json();
    
    if (!modelId) {
      return new Response('Model ID is required', { status: 400 });
    }

    const modelMessages = convertToModelMessages(messages);

    console.log(providerOptions);

    const result = streamText({
      model: gateway(modelId),
      messages: modelMessages,
      providerOptions,
    });

    return result.toUIMessageStreamResponse({
      messageMetadata: ({ part }) => {
        if (part.type === 'finish-step' && part.providerMetadata?.gateway) {
          return { gateway: part.providerMetadata.gateway };
        }
      },
    });
  } catch (error) {
    console.error('Error in gateway chat:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

