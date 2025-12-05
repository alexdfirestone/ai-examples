'use client';

import { useState, useEffect } from 'react';
import { ProviderManager } from './ProviderManager';
import { CodeDisplay } from './CodeDisplay';
import { ChatTab } from './ChatTab';

interface Model {
  id: string;
  name: string;
  description?: string;
  providers: string[];
  isExample?: boolean; // Flag to indicate if this is an example model that can be used
  pricing?: {
    input: number;
    output: number;
    cachedInputTokens?: number;
    cacheCreationInputTokens?: number;
  };
}

type Tab = 'configure' | 'code' | 'chat';

export function GatewayChat() {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('configure');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Provider configuration
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [fullProviderOrder, setFullProviderOrder] = useState<string[]>([]); // Full ordered list (for state restoration)
  const [providerOrder, setProviderOrder] = useState<string[]>([]); // Active providers only (for code generation)
  const [providerOnly, setProviderOnly] = useState<string[] | null>(null);
  
  // Model fallback configuration
  const [fallbackModel, setFallbackModel] = useState<string | null>(null);
  const [fallbackSearchQuery, setFallbackSearchQuery] = useState('');
  const [isFallbackDropdownOpen, setIsFallbackDropdownOpen] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setIsLoadingModels(true);
      setError(null);
      const response = await fetch('/api/gateway/models');
      
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      
      const data = await response.json();
      setModels(data.models);
      
      if (data.models.length > 0) {
        // Select the first example model by default
        const firstExampleModel = data.models.find((m: Model) => m.isExample) || data.models[0];
        setSelectedModel(firstExampleModel.id);
        updateProvidersForModel(firstExampleModel);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
      console.error('Error fetching models:', err);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const selectedModelData = models.find(m => m.id === selectedModel);

  const updateProvidersForModel = (model: Model) => {
    const modelProviders = model.providers || [];
    setAvailableProviders(modelProviders);
    setFullProviderOrder(modelProviders);
    setProviderOrder(modelProviders);
    setProviderOnly(null);
  };

  const handleModelSelect = (model: Model) => {
    // Only allow selecting example models
    if (!model.isExample) {
      return;
    }
    
    setSelectedModel(model.id);
    updateProvidersForModel(model);
    // Reset fallback when primary model changes
    setFallbackModel(null);
    setFallbackSearchQuery('');
    setIsFallbackDropdownOpen(false);
  };

  // Handler that receives the full order from ProviderManager
  const handleFullOrderChange = (fullOrder: string[]) => {
    setFullProviderOrder(fullOrder);
  };

  const filteredModels = models
    .filter(m => 
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Sort example models first
      if (a.isExample && !b.isExample) return -1;
      if (!a.isExample && b.isExample) return 1;
      // Then alphabetically
      return a.id.localeCompare(b.id);
    });

  return (
    <div className="flex h-screen bg-background font-sans text-foreground">
      {/* Sidebar - Model Selection */}
      <div className="w-80 flex flex-col border-r bg-muted/10">
        <div className="p-4 border-b">
          <h2 className="text-sm font-semibold mb-2 px-2">Select Model</h2>
          <div className="relative">
            <svg
              className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border bg-background pl-8 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoadingModels ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : error ? (
            <div className="p-4 text-center text-sm text-destructive">{error}</div>
          ) : (
            filteredModels.map((model) => {
              const isDisabled = !model.isExample;
              return (
                <button
                  key={model.id}
                  onClick={() => handleModelSelect(model)}
                  disabled={isDisabled}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between group ${
                    selectedModel === model.id
                      ? 'bg-primary text-primary-foreground'
                      : isDisabled
                      ? 'text-muted-foreground/60 cursor-default'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="truncate font-medium">{model.id}</span>
                  {selectedModel === model.id && (
                    <span className="h-2 w-2 rounded-full bg-primary-foreground/50" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b flex items-center justify-between px-6 bg-background">
          <div className="flex items-center gap-2">
            <span className="font-semibold">AI Gateway</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">Playground</span>
          </div>
          
          <div className="flex bg-muted rounded-lg p-1">
            {(['configure', 'code', 'chat'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeTab === tab
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </header>

        {/* Tab Content */}
        <main className="flex-1 overflow-hidden bg-muted/5">
          {selectedModelData ? (
            <div className="h-full flex flex-col">
              {activeTab === 'configure' && (
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="max-w-4xl mx-auto space-y-8">
                    {/* Model Info Card - Compact */}
                    <div className="bg-background rounded-xl border shadow-sm p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h1 className="text-lg font-semibold tracking-tight">
                            {selectedModelData.name}
                          </h1>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {selectedModelData.id}
                          </code>
                        </div>
                        <div className="flex gap-1.5">
                          {availableProviders.map(p => (
                            <span key={p} className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium border border-secondary-foreground/10">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>

                      {selectedModelData.description && (
                        <p className="text-xs text-muted-foreground mb-4 leading-relaxed max-w-3xl">
                          {selectedModelData.description}
                        </p>
                      )}

                      <div className="flex gap-6 pt-3 border-t">
                        <div>
                          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Input Price</div>
                          <div className="text-sm font-mono font-medium mt-0.5">
                            ${selectedModelData.pricing?.input ?? '0.00'}
                            <span className="text-[10px] text-muted-foreground font-sans font-normal ml-1">/ 1M</span>
                          </div>
                        </div>
                        <div className="w-px bg-border" />
                        <div>
                          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Output Price</div>
                          <div className="text-sm font-mono font-medium mt-0.5">
                            ${selectedModelData.pricing?.output ?? '0.00'}
                            <span className="text-[10px] text-muted-foreground font-sans font-normal ml-1">/ 1M</span>
                          </div>
                        </div>
                        <div className="w-px bg-border" />
                        <div>
                          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Context</div>
                          <div className="text-sm font-mono font-medium mt-0.5">
                            128k
                            <span className="text-[10px] text-muted-foreground font-sans font-normal ml-1">tok</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Provider Configuration */}
                    <div className="bg-background rounded-xl border shadow-sm p-5 flex-1">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <span>Provider Routing</span>
                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-normal">
                          Drag to Reorder
                        </span>
                      </h3>
                      {availableProviders.length > 1 ? (
                        <ProviderManager
                          providers={availableProviders}
                          currentOrder={fullProviderOrder}
                          currentOnly={providerOnly}
                          onFullOrderChange={handleFullOrderChange}
                          onOrderChange={setProviderOrder}
                          onOnlyChange={setProviderOnly}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground italic">
                          This model is only available via a single provider. No routing configuration needed.
                        </div>
                      )}
                    </div>

                    {/* Model Fallback Configuration */}
                    <div className="bg-background rounded-xl border shadow-sm p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold">Model Fallback</h3>
                        {fallbackModel && (
                          <button
                            onClick={() => {
                              setFallbackModel(null);
                              setFallbackSearchQuery('');
                              setIsFallbackDropdownOpen(false);
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      
                      {fallbackModel ? (
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
                              2
                            </div>
                            <div>
                              <div className="text-sm font-medium">{fallbackModel}</div>
                              <div className="text-xs text-muted-foreground">
                                Fallback model if primary fails
                              </div>
                            </div>
                          </div>
                          <svg 
                            className="w-5 h-5 text-green-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs text-muted-foreground">
                            Select a fallback model to use if the primary model fails
                          </p>
                          <div className="relative">
                            <svg
                              className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="11" cy="11" r="8" />
                              <path d="m21 21-4.3-4.3" />
                            </svg>
                            <input
                              type="text"
                              placeholder="Search for fallback model..."
                              value={fallbackSearchQuery}
                              onChange={(e) => setFallbackSearchQuery(e.target.value)}
                              onFocus={() => setIsFallbackDropdownOpen(true)}
                              onBlur={() => setTimeout(() => setIsFallbackDropdownOpen(false), 200)}
                              className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                            />
                            
                            {isFallbackDropdownOpen && (
                              <div className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto border rounded-lg bg-background shadow-lg">
                                {models
                                  .filter(m => 
                                    m.id !== selectedModel &&
                                    m.isExample && // Only show example models as fallback options
                                    (fallbackSearchQuery === '' || 
                                     m.id.toLowerCase().includes(fallbackSearchQuery.toLowerCase()) ||
                                     m.name.toLowerCase().includes(fallbackSearchQuery.toLowerCase()))
                                  )
                                  .slice(0, 10)
                                  .map((model) => (
                                    <button
                                      key={model.id}
                                      onClick={() => {
                                        setFallbackModel(model.id);
                                        setFallbackSearchQuery('');
                                        setIsFallbackDropdownOpen(false);
                                      }}
                                      className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors border-b last:border-b-0 flex items-center justify-between group"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{model.id}</div>
                                        <div className="text-xs text-muted-foreground truncate">{model.name}</div>
                                      </div>
                                      <svg 
                                        className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                      </svg>
                                    </button>
                                  ))}
                                {models.filter(m => 
                                  m.id !== selectedModel &&
                                  m.isExample && // Only show example models as fallback options
                                  (fallbackSearchQuery === '' || 
                                   m.id.toLowerCase().includes(fallbackSearchQuery.toLowerCase()) ||
                                   m.name.toLowerCase().includes(fallbackSearchQuery.toLowerCase()))
                                ).length === 0 && (
                                  <div className="p-4 text-center text-sm text-muted-foreground">
                                    No models found
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'code' && (
                <CodeDisplay
                  selectedModel={selectedModel}
                  fallbackModel={fallbackModel}
                  providerOrder={providerOrder}
                  providerOnly={providerOnly}
                />
              )}

              {activeTab === 'chat' && (
                <div className="h-full flex flex-col bg-background">
                  <ChatTab
                    selectedModel={selectedModel}
                    fallbackModel={fallbackModel}
                    providerOrder={providerOrder}
                    providerOnly={providerOnly}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select a model to configure
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
