'use client';

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect, useMemo } from 'react';
import { DefaultChatTransport } from 'ai';

const DEFAULT_MODEL = 'openai/gpt-4o-mini';

interface ChatTabProps {
  selectedModel: string;
  fallbackModel: string | null;
  providerOrder: string[];
  providerOnly: string[] | null;
}

// Mock data generator for fallback simulation
function generateFallbackMockData(model: string, providers: string[]) {
  const [vendor, modelName] = model.split('/');
  const primaryProvider = providers[0] || vendor;
  const fallbackProvider = providers[1] || vendor;
  const remainingFallbacks = providers.slice(2);
  const now = Date.now();
  
  // Generate realistic model IDs based on provider - fully dynamic for all provider types
  const getProviderModelId = (provider: string, modelName: string, vendor: string) => {
    const lowerProvider = provider.toLowerCase();
    
    // Each provider has their own model ID format
    switch (lowerProvider) {
      case 'bedrock':
        return `${vendor}.${modelName}-v1:0`;
      case 'azure':
        return modelName; // Azure uses deployment names
      case 'openai':
        return `${modelName}-2024-08-06`;
      case 'anthropic':
        return `${modelName}-20240229`;
      case 'google':
      case 'vertex':
        return `${modelName}-001`;
      case 'groq':
        return `${modelName}-preview`;
      case 'mistral':
        return `${modelName}-latest`;
      default:
        return `${modelName}-2024-08-06`; // Generic fallback
    }
  };
  
  const primaryModelId = getProviderModelId(primaryProvider, modelName, vendor);
  const fallbackModelId = getProviderModelId(fallbackProvider, modelName, vendor);
  
  return {
    routing: {
      originalModelId: model,
      resolvedProvider: primaryProvider,
      resolvedProviderApiModelId: fallbackModelId,
      internalResolvedModelId: `${fallbackProvider}:${fallbackModelId}`,
      fallbacksAvailable: remainingFallbacks,
      internalReasoning: `Primary provider ${primaryProvider} returned 529 (overloaded). Falling back to ${fallbackProvider}. Request succeeded on fallback.`,
      planningReasoning: `System credentials planned for: ${providers.join(', ')}. Total execution order: ${providers.map(p => `${p}(system)`).join(' → ')}`,
      canonicalSlug: model,
      finalProvider: fallbackProvider,
      attempts: [
        {
          provider: primaryProvider,
          internalModelId: `${primaryProvider}:${primaryModelId}`,
          providerApiModelId: primaryModelId,
          credentialType: "system",
          success: false,
          startTime: now,
          endTime: now + 89,
          statusCode: 529,
          error: "overloaded_error"
        },
        {
          provider: fallbackProvider,
          internalModelId: `${fallbackProvider}:${fallbackModelId}`,
          providerApiModelId: fallbackModelId,
          credentialType: "system",
          success: true,
          startTime: now + 102,
          endTime: now + 245,
          statusCode: 200
        }
      ],
      modelAttemptCount: 1,
      totalProviderAttemptCount: 2
    },
    cost: "0.00021500",
    marketCost: "0.00021500",
    generationId: `gen_${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
    billableWebSearchCalls: 0
  };
}

// Gateway Metadata Display Component
function GatewayMetadata({ data }: { data: any }) {
  const [expanded, setExpanded] = useState(false);
  
  const routing = data?.routing;
  const cost = data?.cost;
  
  if (!routing) return null;
  
  const attempt = routing.attempts?.[0];
  const latency = attempt ? Math.round(attempt.endTime - attempt.startTime) : null;
  const success = attempt?.success;
  
  return (
    <div className="rounded-lg border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white overflow-hidden text-xs">
      {/* Summary Row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-zinc-50/50 transition-colors"
      >
        {/* Status indicator */}
        <div className={`w-2 h-2 rounded-full ${success ? 'bg-emerald-500' : 'bg-red-500'}`} />
        
        {/* Provider pill */}
        <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold text-[10px]">
          {routing.finalProvider}
        </span>
        
        {/* Model */}
        <span className="font-mono text-zinc-600 text-[10px]">
          {routing.resolvedProviderApiModelId}
        </span>
        
        {/* Spacer */}
        <div className="flex-1" />
        
        {/* Stats */}
        <div className="flex items-center gap-3 text-[10px] text-zinc-500">
          {latency && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              {latency}ms
            </span>
          )}
          {cost && (
            <span className="flex items-center gap-1 text-emerald-600">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
              ${parseFloat(cost).toFixed(5)}
            </span>
          )}
        </div>
        
        {/* Expand icon */}
        <svg 
          className={`w-4 h-4 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`} 
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-zinc-100 px-3 py-3 space-y-3 bg-zinc-50/30">
          {/* Routing Flow */}
          <div>
            <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Routing</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-zinc-500 bg-white px-2 py-1 rounded border text-[10px]">
                {routing.originalModelId}
              </span>
              <svg className="w-4 h-4 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span className="font-mono text-violet-600 bg-violet-50 px-2 py-1 rounded border border-violet-200 text-[10px]">
                {routing.internalResolvedModelId}
              </span>
            </div>
          </div>
          
          {/* Fallbacks */}
          {routing.fallbacksAvailable?.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Fallbacks Available</div>
              <div className="flex gap-1">
                {routing.fallbacksAvailable.map((fb: string) => (
                  <span key={fb} className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] border border-amber-200">
                    {fb}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Attempts Timeline */}
          {routing.attempts?.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Attempts ({routing.totalProviderAttemptCount})
              </div>
              <div className="space-y-1.5">
                {routing.attempts.map((att: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 bg-white rounded px-2 py-1.5 border">
                    <div className={`w-1.5 h-1.5 rounded-full ${att.success ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className="font-semibold text-zinc-700 text-[10px]">{att.provider}</span>
                    <span className="font-mono text-zinc-400 text-[10px]">{att.providerApiModelId}</span>
                    <div className="flex-1" />
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      att.statusCode === 200 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : 'bg-red-50 text-red-600'
                    }`}>
                      {att.statusCode}
                    </span>
                    <span className="text-zinc-400 text-[10px]">
                      {Math.round(att.endTime - att.startTime)}ms
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Reasoning */}
          {routing.internalReasoning && (
            <div>
              <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Reasoning</div>
              <p className="text-[10px] text-zinc-600 leading-relaxed bg-white rounded px-2 py-1.5 border">
                {routing.internalReasoning}
              </p>
            </div>
          )}
          
          {/* Generation ID */}
          {data.generationId && (
            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
              <span className="text-[10px] text-zinc-400">Generation ID</span>
              <code className="text-[9px] font-mono text-zinc-500 bg-white px-2 py-0.5 rounded border">
                {data.generationId}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatTab({ selectedModel, fallbackModel, providerOrder, providerOnly }: ChatTabProps) {
  const [input, setInput] = useState('');
  const [simulateFallback, setSimulateFallback] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Track which messages should show simulated metadata
  const [simulatedMessageIds, setSimulatedMessageIds] = useState<Set<string>>(new Set());

  // Use the configured model or fall back to default
  const activeModel = selectedModel || DEFAULT_MODEL;
  
  // Get providers list from configuration
  const providers = providerOnly || providerOrder || [];

  // Create transport with body function that includes model and provider config
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: '/api/gateway/chat',
      body: () => {
        const bodyData: Record<string, unknown> = {
          modelId: fallbackModel ? [activeModel, fallbackModel] : activeModel,
        };

        // Add provider options based on configuration
        const gatewayOptions: Record<string, unknown> = {};
        
        if (providerOnly && providerOnly.length > 0) {
          gatewayOptions.only = providerOnly;
        } else if (providerOrder.length > 0) {
          gatewayOptions.order = providerOrder;
        }
        
        if (fallbackModel) {
          gatewayOptions.models = [fallbackModel];
        }
        
        if (Object.keys(gatewayOptions).length > 0) {
          bodyData.providerOptions = {
            gateway: gatewayOptions,
          };
        }

        return bodyData;
      },
    });
  }, [activeModel, fallbackModel, providerOrder, providerOnly]);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
  });

  const handleNewChat = () => {
    setMessages([]);
    setSimulatedMessageIds(new Set());
  };

  // Track the simulation state when submitting
  const simulationStateOnSubmit = useRef(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeModel) return;
    
    // Capture the simulation state at the time of submission
    simulationStateOnSubmit.current = simulateFallback && providers.length >= 2;
    
    sendMessage({ text: input });
    setInput('');
  };

  // Track new assistant messages and mark them for simulation if needed
  useEffect(() => {
    if (messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    
    // If the last message is an assistant message and we had simulation enabled when submitting
    if (lastMessage.role === 'assistant' && simulationStateOnSubmit.current) {
      // Check if we haven't already marked this message
      if (!simulatedMessageIds.has(lastMessage.id)) {
        setSimulatedMessageIds((prev) => new Set(prev).add(lastMessage.id));
        // Reset the flag after marking
        simulationStateOnSubmit.current = false;
      }
    }
  }, [messages, simulatedMessageIds]);
  
  // Generate simulated metadata for display - cache is stable across renders
  const simulatedMetadataCache = useRef(new Map<string, any>());
  
  const getSimulatedMetadata = (messageId: string) => {
    if (!simulatedMetadataCache.current.has(messageId)) {
      const mockData = generateFallbackMockData(activeModel, providers);
      simulatedMetadataCache.current.set(messageId, mockData);
    }
    return simulatedMetadataCache.current.get(messageId);
  };

  const isLoading = status === 'submitted' || status === 'streaming';

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Configuration Display */}
      <div className="border-b p-4 bg-muted/30">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Model:</span>
              <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-medium">
                {activeModel}
              </code>
              {!selectedModel && (
                <span className="text-[10px] text-muted-foreground">(default)</span>
              )}
              {fallbackModel && (
                <>
                  <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <code className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium">
                    {fallbackModel}
                  </code>
                  <span className="text-[10px] text-muted-foreground">(fallback)</span>
                </>
              )}
            </div>
            {providerOnly ? (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Only Providers:</span>
                <div className="flex gap-1">
                  {providerOnly.map(p => (
                    <span key={p} className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-medium border border-emerald-500/20">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ) : providerOrder.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Provider Order:</span>
                <div className="flex gap-1">
                  {providerOrder.map((p, i) => (
                    <span key={p} className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-medium border border-amber-500/20">
                      {i + 1}. {p}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">Using default provider configuration</div>
            )}
          </div>
          
          {/* New Chat Button */}
          {messages.length > 0 && (
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-background hover:bg-muted border rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
          )}
        </div>

        {/* Simulation Checkbox */}
        <div className="pt-3 border-t">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Simulate:</span>
            
            <label className={`flex items-center gap-2 cursor-pointer group ${simulateFallback ? 'text-violet-600' : 'text-muted-foreground'} ${providers.length < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={simulateFallback}
                  disabled={providers.length < 2}
                  onChange={(e) => setSimulateFallback(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`w-4 h-4 rounded border-2 transition-colors ${
                  simulateFallback 
                    ? 'bg-violet-500 border-violet-500' 
                    : providers.length < 2 
                      ? 'border-zinc-200' 
                      : 'border-zinc-300 group-hover:border-violet-400'
                }`}>
                  {simulateFallback && (
                    <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span className="text-xs font-medium">Provider Fallback</span>
                {providers.length >= 2 && (
                  <span className="text-[10px] text-muted-foreground">
                    ({providers[0]} → {providers[1]})
                  </span>
                )}
              </div>
            </label>
            
            {providers.length < 2 && (
              <span className="text-[10px] text-muted-foreground italic">
                Add 2+ providers to test fallback
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-foreground mb-1">Test your gateway configuration</p>
            <p className="text-sm text-muted-foreground">Start chatting to see it in action</p>
            {simulateFallback && (
              <p className="text-xs text-violet-600 mt-2">Simulation mode active — type anything to see the demo</p>
            )}
          </div>
        ) : (
          messages.map((message) => {
            const textPart = message.parts.find(p => p.type === 'text');
            const content = textPart && 'text' in textPart ? textPart.text : '';
            const isUser = message.role === 'user';
            // Use simulated metadata only if this specific message was sent with simulation enabled
            const shouldSimulate = simulatedMessageIds.has(message.id);
            const gatewayMeta = shouldSimulate && !isUser
              ? getSimulatedMetadata(message.id)
              : (message.metadata as any)?.gateway;
            
            return (
              <div
                key={message.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[80%] flex flex-col gap-2">
                  <div
                    className={`p-4 rounded-xl shadow-sm ${
                      isUser
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted/50 border rounded-bl-sm'
                    }`}
                  >
                    <div className={`text-[10px] font-medium mb-1.5 uppercase tracking-wider ${
                      isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {isUser ? 'You' : 'AI'}
                    </div>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {content}
                    </div>
                  </div>
                  
                  {/* Gateway Provider Metadata */}
                  {!isUser && gatewayMeta && (
                    <GatewayMetadata data={gatewayMeta} />
                  )}
                </div>
              </div>
            );
          })
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted/50 border rounded-xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-background">
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-4xl mx-auto p-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 border rounded-lg px-4 py-2.5 text-sm bg-background outline-none focus:ring-1 focus:ring-ring disabled:bg-muted disabled:cursor-not-allowed placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending
              </span>
            ) : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

