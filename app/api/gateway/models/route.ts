import { gateway } from 'ai';
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
    
    // Mock provider data for specific models
    const mockProviders: Record<string, Provider[]> = {
      'openai/gpt-5': ['azure', 'openai'],
      'openai/gpt-oss-120b': ['parasail', 'groq', 'fireworks', 'cerebras', 'bedrock', 'baseten'],
    };
    
    // Only include models that have mock provider data
    const models = availableModels.models
      .filter(model => mockProviders[model.id])
      .map(model => {
        return {
          id: model.id,
          name: model.name,
          description: model.description,
          providers: mockProviders[model.id],
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

