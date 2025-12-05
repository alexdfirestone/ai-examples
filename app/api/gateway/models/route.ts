import { gateway } from '@ai-sdk/gateway';
import { NextResponse } from 'next/server';

// All available providers in AI Gateway
type Provider = 
  | 'alibaba'
  | 'anthropic'
  | 'arcee-ai'
  | 'azure'
  | 'baseten'
  | 'bedrock'
  | 'bfl'
  | 'cerebras'
  | 'cohere'
  | 'deepinfra'
  | 'deepseek'
  | 'fireworks'
  | 'google'
  | 'groq'
  | 'inception'
  | 'meituan'
  | 'minimax'
  | 'mistral'
  | 'moonshotai'
  | 'morph'
  | 'novita'
  | 'openai'
  | 'parasail'
  | 'perplexity'
  | 'vercel'
  | 'vertex'
  | 'voyage'
  | 'xai'
  | 'zai';

export async function GET() {
  try {
    const availableModels = await gateway.getAvailableModels();
    console.log(availableModels);
    
    // Mock provider data for specific models (these are the example models users can interact with)
    const exampleModels: Record<string, Provider[]> = {
      'openai/gpt-5': ['azure', 'openai'],
      'openai/gpt-oss-120b': ['parasail', 'groq', 'fireworks', 'cerebras', 'bedrock', 'baseten'],
    };
    
    // Return ALL models, but mark which ones are examples (enabled)
    const models = availableModels.models.map(model => {
      const isExample = model.id in exampleModels;
      return {
        id: model.id,
        name: model.name,
        description: model.description,
        providers: isExample ? exampleModels[model.id] : [],
        isExample, // Flag to indicate if this is an example model
        pricing: model.pricing ? {
          input: model.pricing.input,
          output: model.pricing.output,
          cachedInputTokens: model.pricing.cachedInputTokens,
          cacheCreationInputTokens: model.pricing.cacheCreationInputTokens,
        } : null,
      };
    });
    
    return NextResponse.json({
      models,
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available models' },
      { status: 500 }
    );
  }
}

