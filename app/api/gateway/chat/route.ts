import { gateway } from 'ai'
import { streamText, convertToModelMessages } from 'ai';

export async function POST(req: Request) {
  try {
    const { messages, modelId, providerOptions } = await req.json();
    
    if (!modelId) {
      return new Response('Model ID is required', { status: 400 });
    }

    const modelMessages = convertToModelMessages(messages);

    console.log('Model ID:', modelId);
    console.log('Provider Options:', providerOptions);

    // Handle model - use the first model ID if array is provided
    // The gateway provider handles fallback via providerOptions.gateway
    const primaryModelId = Array.isArray(modelId) ? modelId[0] : modelId;
    const model = gateway(primaryModelId);

    console.log('Processed model:', model);

    const result = streamText({
      model: model,
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

