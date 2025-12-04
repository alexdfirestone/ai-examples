'use client';

import { useState } from 'react';

interface CodeDisplayProps {
  selectedModel: string;
  providerOrder: string[];
  providerOnly: string[] | null;
}

export function CodeDisplay({ selectedModel, providerOrder, providerOnly }: CodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [hoveredToken, setHoveredToken] = useState<string | null>(null);

  const generateCode = () => {
    const hasProviderOptions = providerOrder.length > 0 || providerOnly !== null;
    
    let providerOptionsCode = '';
    if (hasProviderOptions) {
      providerOptionsCode = `    providerOptions: {
      gateway: {`;
      
      if (providerOnly) {
        providerOptionsCode += `
        only: [${providerOnly.map(p => `'${p}'`).join(', ')}],`;
      }
      
      if (providerOrder.length > 0) {
        providerOptionsCode += `
        order: [${providerOrder.map(p => `'${p}'`).join(', ')}],`;
      }
      
      providerOptionsCode += `
      },
    },`;
    }

    return `import { streamText } from 'ai';
import { createGateway } from '@ai-sdk/gateway';

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

export async function POST(request: Request) {
  const { prompt } = await request.json();

  const result = streamText({
    model: gateway('${selectedModel}'),
    prompt,${providerOptionsCode}
  });

  return result.toDataStreamResponse();
}`;
  };

  const code = generateCode();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const Token = ({ type, children, interactiveId, tooltip }: { type: string; children: React.ReactNode; interactiveId?: string; tooltip?: string }) => {
    const colorMap: Record<string, string> = {
      keyword: '#c678dd', // purple
      function: '#61afef', // blue
      string: '#98c379', // green
      comment: '#5c6370', // grey
      punctuation: '#abb2bf', // white/grey
      property: '#e06c75', // red/pink
      variable: '#e5c07b', // yellow/gold
      plain: '#abb2bf'
    };

    const isInteractive = !!interactiveId;
    const isHovered = hoveredToken === interactiveId;

    return (
      <span 
        className={`
          relative inline-block
          ${isInteractive ? 'cursor-help' : ''} 
          ${isInteractive && isHovered ? 'bg-white/10 rounded px-0.5 -mx-0.5 ring-1 ring-white/20 z-20' : ''}
        `}
        style={{ color: colorMap[type] || colorMap.plain }}
        onMouseEnter={() => isInteractive && setHoveredToken(interactiveId)}
        onMouseLeave={() => isInteractive && setHoveredToken(null)}
      >
        {children}
        {isInteractive && isHovered && (
          <div className="absolute z-[100] left-0 bottom-full mb-2 w-[280px] p-4 bg-[#18181b] border border-[#27272a] rounded-lg shadow-2xl text-xs text-gray-300 leading-relaxed pointer-events-none animate-in fade-in zoom-in-95 duration-100 whitespace-normal">
            <div className="font-semibold text-white mb-2 border-b border-[#27272a] pb-2 text-sm">
              {interactiveId === 'model' && 'Model Selection'}
              {interactiveId === 'order' && 'Provider Routing Order'}
              {interactiveId === 'only' && 'Provider Restriction'}
              {interactiveId === 'gateway' && 'AI Gateway Configuration'}
            </div>
            <p className="text-gray-400 text-[13px] leading-5">{tooltip}</p>
            {/* Arrow aligned to left to match tooltip position */}
            <div className="absolute left-4 bottom-[-5px] w-2.5 h-2.5 bg-[#18181b] border-r border-b border-[#27272a] rotate-45"></div>
          </div>
        )}
      </span>
    );
  };

  const renderCode = () => {
    const lines = code.split('\n');
    
    return lines.map((line, i) => (
      <div key={i} className="table-row hover:bg-white/[0.02] transition-colors">
        <span className="table-cell text-[#454545] select-none text-right pr-6 w-8 font-mono text-[13px]">{i + 1}</span>
        <span className="table-cell whitespace-pre font-mono text-[13px]">
          {line.includes('import') ? (
            <>
              <Token type="keyword">import</Token> <Token type="punctuation">{'{'}</Token> <Token type="variable">streamText</Token> <Token type="punctuation">{'}'}</Token> <Token type="keyword">from</Token> <Token type="string">'ai'</Token><Token type="punctuation">;</Token>
            </>
          ) : line.includes('createGateway') && line.includes('import') ? (
            <>
              <Token type="keyword">import</Token> <Token type="punctuation">{'{'}</Token> <Token type="function">createGateway</Token> <Token type="punctuation">{'}'}</Token> <Token type="keyword">from</Token> <Token type="string">'@ai-sdk/gateway'</Token><Token type="punctuation">;</Token>
            </>
          ) : line.includes('const gateway = createGateway') ? (
            <>
              <Token type="keyword">const</Token> <Token type="variable">gateway</Token> <Token type="punctuation">=</Token> <Token type="function">createGateway</Token><Token type="punctuation">({'{}'});</Token>
            </>
          ) : line.includes('apiKey:') ? (
            <>
              <Token type="property">  apiKey</Token><Token type="punctuation">:</Token> <Token type="variable">process</Token><Token type="punctuation">.</Token><Token type="variable">env</Token><Token type="punctuation">.</Token><Token type="variable">AI_GATEWAY_API_KEY</Token><Token type="punctuation">,</Token>
            </>
          ) : line.includes('export async function') ? (
            <>
              <Token type="keyword">export async function</Token> <Token type="function">POST</Token><Token type="punctuation">(</Token><Token type="variable">request</Token><Token type="punctuation">:</Token> <Token type="variable">Request</Token><Token type="punctuation">) {'{'}</Token>
            </>
          ) : line.includes('const { prompt }') ? (
            <>
              <Token type="keyword">  const</Token> <Token type="punctuation">{'{'}</Token> <Token type="variable">prompt</Token> <Token type="punctuation">{'}'}</Token> <Token type="punctuation">=</Token> <Token type="keyword">await</Token> <Token type="variable">request</Token><Token type="function">.json</Token><Token type="punctuation">();</Token>
            </>
          ) : line.includes('const result = streamText') ? (
            <>
              <Token type="keyword">  const</Token> <Token type="variable">result</Token> <Token type="punctuation">=</Token> <Token type="function">streamText</Token><Token type="punctuation">({'{}'}</Token>
            </>
          ) : line.includes('model: gateway') ? (
            <>
              <Token type="property">    model</Token><Token type="punctuation">:</Token> <Token type="function">gateway</Token><Token type="punctuation">(</Token><Token type="string" interactiveId="model" tooltip="Routes the request to a specific model ID. The Gateway will automatically select the best provider based on your configuration or defaults.">'{selectedModel}'</Token><Token type="punctuation">),</Token>
            </>
          ) : line.includes('prompt,') ? (
            <>
              <Token type="property">    prompt</Token><Token type="punctuation">,</Token>
            </>
          ) : line.includes('providerOptions:') ? (
            <>
              <Token type="property">    providerOptions</Token><Token type="punctuation">:</Token> <Token type="punctuation">{'{'}</Token>
            </>
          ) : line.includes('gateway: {') ? (
            <>
              <Token type="property" interactiveId="gateway" tooltip="Configures AI Gateway specific routing rules.">      gateway</Token><Token type="punctuation">:</Token> <Token type="punctuation">{'{'}</Token>
            </>
          ) : line.includes('only:') ? (
            <>
              <Token type="property" interactiveId="only" tooltip="Strictly limits the request to ONLY use these providers. If these providers are down or rate-limited, the request will fail rather than falling back to others.">        only</Token><Token type="punctuation">:</Token> <Token type="punctuation">[</Token>{providerOnly?.map((p, i) => (
                <span key={i}><Token type="string">'{p}'</Token>{i < (providerOnly?.length || 0) - 1 && <Token type="punctuation">, </Token>}</span>
              ))}<Token type="punctuation">],</Token>
            </>
          ) : line.includes('order:') ? (
            <>
              <Token type="property" interactiveId="order" tooltip="Sets the priority order for routing. The Gateway will attempt providers in this sequence, falling back to the next one if an error occurs.">        order</Token><Token type="punctuation">:</Token> <Token type="punctuation">[</Token>{providerOrder.map((p, i) => (
                <span key={i}><Token type="string">'{p}'</Token>{i < providerOrder.length - 1 && <Token type="punctuation">, </Token>}</span>
              ))}<Token type="punctuation">],</Token>
            </>
          ) : line.includes('return result') ? (
            <>
              <Token type="keyword">  return</Token> <Token type="variable">result</Token><Token type="function">.toDataStreamResponse</Token><Token type="punctuation">();</Token>
            </>
          ) : (
            <Token type="punctuation">{line}</Token>
          )}
        </span>
      </div>
    ));
  };

  return (
    <div className="h-full w-full flex items-center justify-center p-8 bg-muted/10">
      <div className="w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl border border-black/10 bg-[#0c0c0c]">
        {/* Window Title Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0c0c0c] border-b border-[#27272a]">
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-[#ff5f56]" />
              <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
              <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
            </div>
            <span className="text-xs text-gray-500 font-mono">app/api/chat/route.ts</span>
          </div>
          <button
            onClick={handleCopy}
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-all border border-white/5"
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-xs font-medium text-green-500">Copied</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 group-hover:text-white">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span className="text-xs font-medium text-gray-400 group-hover:text-white">Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Code Area */}
        <div className="p-6 bg-[#0c0c0c] overflow-x-auto">
          <div className="table w-full border-collapse">
            {renderCode()}
          </div>
        </div>
      </div>
    </div>
  );
}
