'use client';

import { useState, useEffect, useRef } from 'react';

interface ProviderManagerProps {
  providers: string[];
  currentOrder: string[];
  currentOnly: string[] | null;
  onFullOrderChange: (fullOrder: string[]) => void;
  onOrderChange: (order: string[]) => void;
  onOnlyChange: (only: string[] | null) => void;
}

export function ProviderManager({ providers, currentOrder, currentOnly, onFullOrderChange, onOrderChange, onOnlyChange }: ProviderManagerProps) {
  // Track if we've done the initial setup
  const initializedRef = useRef(false);
  const prevProvidersRef = useRef<string[]>(providers);
  
  const [orderedProviders, setOrderedProviders] = useState<string[]>(() => {
    // Initialize from currentOrder if it has the same providers, else use providers
    const currentSet = new Set(currentOrder);
    const providerSet = new Set(providers);
    const isSameSet = currentSet.size === providerSet.size && 
                      [...providerSet].every(p => currentSet.has(p));
    return isSameSet ? currentOrder : providers;
  });
  
  const [excludedProviders, setExcludedProviders] = useState<Set<string>>(() => {
    // Initialize from currentOnly
    const excluded = new Set<string>();
    if (currentOnly) {
      const onlySet = new Set(currentOnly);
      providers.forEach(p => {
        if (!onlySet.has(p)) {
          excluded.add(p);
        }
      });
    }
    return excluded;
  });
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Only reset state when the MODEL changes (providers list changes)
  useEffect(() => {
    const providersChanged = prevProvidersRef.current.length !== providers.length ||
      !prevProvidersRef.current.every((p, i) => providers.includes(p));
    
    if (providersChanged) {
      // Model changed - reset to new providers
      setOrderedProviders(providers);
      setExcludedProviders(new Set());
      prevProvidersRef.current = providers;
    } else if (!initializedRef.current) {
      // First mount with existing state from parent
      const currentSet = new Set(currentOrder);
      const providerSet = new Set(providers);
      const isSameSet = currentSet.size === providerSet.size && 
                        [...providerSet].every(p => currentSet.has(p));
      
      if (isSameSet) {
        setOrderedProviders(currentOrder);
        
        const excluded = new Set<string>();
        if (currentOnly) {
          const onlySet = new Set(currentOnly);
          providers.forEach(p => {
            if (!onlySet.has(p)) {
              excluded.add(p);
            }
          });
        }
        setExcludedProviders(excluded);
      }
      initializedRef.current = true;
    }
  }, [providers, currentOrder, currentOnly]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...orderedProviders];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);

    setOrderedProviders(newOrder);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    // Notify parent of the new order
    onFullOrderChange(orderedProviders); // Full order for state restoration
    const activeProviders = orderedProviders.filter(p => !excludedProviders.has(p));
    onOrderChange(activeProviders);
    if (excludedProviders.size > 0) {
      onOnlyChange(activeProviders);
    } else {
      onOnlyChange(null);
    }
  };

  const handleToggle = (provider: string) => {
    const newExcluded = new Set(excludedProviders);
    
    if (newExcluded.has(provider)) {
      newExcluded.delete(provider);
    } else {
      // Don't allow excluding all providers
      if (newExcluded.size >= orderedProviders.length - 1) {
        return;
      }
      newExcluded.add(provider);
    }
    
    setExcludedProviders(newExcluded);
    
    // Notify parent
    onFullOrderChange(orderedProviders); // Full order for state restoration
    const activeProviders = orderedProviders.filter(p => !newExcluded.has(p));
    onOrderChange(activeProviders);
    if (newExcluded.size > 0) {
      onOnlyChange(activeProviders);
    } else {
      onOnlyChange(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Priority Order</span>
        <span>Enabled</span>
      </div>

      <div className="flex flex-col gap-2">
        {orderedProviders.map((provider, index) => {
          const isExcluded = excludedProviders.has(provider);
          const isOnlyOneLeft = orderedProviders.length - excludedProviders.size === 1;
          const isDragging = draggedIndex === index;
          const rank = index + 1;
          
          return (
            <div
              key={provider}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                relative group flex items-center justify-between 
                p-2.5 rounded-lg border bg-background transition-all duration-150
                ${isDragging ? 'shadow-lg scale-[1.02] z-10 ring-2 ring-primary/30 border-primary opacity-90' : 'hover:border-primary/30 hover:shadow-sm'}
                ${isExcluded ? 'bg-muted/20 border-dashed border-muted-foreground/20' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                {/* Drag Handle + Rank */}
                <div className="flex items-center gap-2 pl-1 pr-2 py-1 rounded cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                  <svg width="8" height="14" viewBox="0 0 10 16" fill="currentColor" className="h-3.5 w-3.5">
                    <circle cx="2" cy="2" r="1.5" />
                    <circle cx="8" cy="2" r="1.5" />
                    <circle cx="2" cy="8" r="1.5" />
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="2" cy="14" r="1.5" />
                    <circle cx="8" cy="14" r="1.5" />
                  </svg>
                  <span className={`font-mono text-xs font-semibold w-4 text-center ${isExcluded ? 'text-muted-foreground/50' : ''}`}>
                    {rank}
                  </span>
                </div>
                
                <span className={`text-sm font-medium transition-colors ${isExcluded ? 'text-muted-foreground/50 line-through' : 'text-foreground'}`}>
                  {provider}
                </span>
              </div>
              
              <button
                onClick={() => handleToggle(provider)}
                disabled={!isExcluded && isOnlyOneLeft}
                className={`
                  relative inline-flex h-5 w-9 items-center rounded-full border-2 border-transparent 
                  transition-colors duration-200 ease-in-out focus:outline-none
                  ${!isExcluded ? 'bg-primary' : 'bg-muted'}
                  ${!isExcluded && isOnlyOneLeft ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <span className="sr-only">Toggle {provider}</span>
                <span
                  className={`
                    pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 
                    transition duration-200 ease-in-out
                    ${!isExcluded ? 'translate-x-4' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
