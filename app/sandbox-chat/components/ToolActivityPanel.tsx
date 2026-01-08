'use client';

import { useState, useEffect, useRef } from 'react';

export interface ToolCallOutput {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  command?: string;
  isRecitation?: boolean;
  recitationNumber?: number;
}

export interface ToolCallInput {
  command?: string;
  [key: string]: unknown;
}

export interface ToolCall {
  id: string;
  toolName: string;
  input: ToolCallInput;
  output?: ToolCallOutput;
  state: 'pending' | 'running' | 'completed' | 'error';
  timestamp: number;
  isRecitation?: boolean;
  recitationNumber?: number;
}

interface ToolActivityPanelProps {
  toolCalls: ToolCall[];
  recitationCount: number;
  todoContent: string | null;
}

export function ToolActivityPanel({ toolCalls, recitationCount, todoContent }: ToolActivityPanelProps) {
  const [expandedCalls, setExpandedCalls] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new tool calls arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [toolCalls]);

  const toggleExpand = (id: string) => {
    setExpandedCalls(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#0d1117',
      color: '#e6edf3',
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    }}>
      {/* Header with recitation counter */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #30363d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#161b22',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#f0f6fc' }}>
            Tool Activity
          </span>
          <span style={{
            fontSize: '12px',
            color: '#8b949e',
            background: '#21262d',
            padding: '2px 8px',
            borderRadius: '12px',
          }}>
            {toolCalls.length} calls
          </span>
        </div>
        
        {/* Recitation counter badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: recitationCount > 0 ? 'linear-gradient(135deg, #238636 0%, #2ea043 100%)' : '#21262d',
          padding: '6px 12px',
          borderRadius: '16px',
          fontSize: '12px',
          fontWeight: 600,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
          <span>Recitations: {recitationCount}</span>
        </div>
      </div>

      {/* Todo preview section */}
      {todoContent && (
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid #30363d',
          background: '#161b22',
        }}>
          <div style={{
            fontSize: '11px',
            color: '#8b949e',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Current todo.md
          </div>
          <pre style={{
            margin: 0,
            fontSize: '11px',
            lineHeight: '1.5',
            color: '#7ee787',
            whiteSpace: 'pre-wrap',
            maxHeight: '120px',
            overflow: 'auto',
            background: '#0d1117',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #238636',
          }}>
            {todoContent}
          </pre>
        </div>
      )}

      {/* Tool calls list */}
      <div 
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
        }}
      >
        {toolCalls.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: '#8b949e',
            fontSize: '13px',
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '12px', opacity: 0.5 }}>
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span>Waiting for tool calls...</span>
            <span style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
              The AI will execute commands here
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {toolCalls.map((call, index) => (
              <ToolCallCard
                key={call.id}
                call={call}
                index={index}
                isExpanded={expandedCalls.has(call.id)}
                onToggle={() => toggleExpand(call.id)}
                formatTime={formatTime}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ToolCallCardProps {
  call: ToolCall;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  formatTime: (timestamp: number) => string;
}

function ToolCallCard({ call, index, isExpanded, onToggle, formatTime }: ToolCallCardProps) {
  const isRecitation = call.isRecitation || 
    (call.input?.command && String(call.input.command).includes('cat todo.md'));
  
  const output = call.output;
  const hasOutput = output && (output.stdout || output.stderr);

  return (
    <div style={{
      background: isRecitation ? '#0f2d1e' : '#161b22',
      border: `1px solid ${isRecitation ? '#238636' : '#30363d'}`,
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={onToggle}
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          borderBottom: isExpanded ? `1px solid ${isRecitation ? '#238636' : '#30363d'}` : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Status indicator */}
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: call.state === 'completed' ? '#238636' : 
                       call.state === 'error' ? '#f85149' : 
                       call.state === 'running' ? '#d29922' : '#8b949e',
            animation: call.state === 'running' ? 'pulse 1.5s infinite' : 'none',
          }} />
          
          {/* Index and name */}
          <span style={{ 
            fontSize: '12px', 
            color: '#8b949e',
            fontWeight: 500,
          }}>
            #{index + 1}
          </span>
          
          {isRecitation && (
            <span style={{
              fontSize: '10px',
              background: '#238636',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 600,
            }}>
              RECITE #{call.recitationNumber || '?'}
            </span>
          )}
          
          {/* Command preview */}
          <code style={{
            fontSize: '12px',
            color: isRecitation ? '#7ee787' : '#e6edf3',
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {String(call.input?.command || call.toolName).substring(0, 40)}
            {String(call.input?.command || '').length > 40 ? '...' : ''}
          </code>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#8b949e' }}>
            {formatTime(call.timestamp)}
          </span>
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#8b949e" 
            strokeWidth="2"
            style={{ 
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ padding: '12px 14px' }}>
          {/* Input */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              fontSize: '10px', 
              color: '#8b949e', 
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Command
            </div>
            <pre style={{
              margin: 0,
              padding: '10px 12px',
              background: '#0d1117',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#79c0ff',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              $ {String(call.input?.command || JSON.stringify(call.input, null, 2))}
            </pre>
          </div>

          {/* Output */}
          {hasOutput && (
            <div>
              <div style={{ 
                fontSize: '10px', 
                color: '#8b949e', 
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                Output
                {output.exitCode !== undefined && (
                  <span style={{
                    background: output.exitCode === 0 ? '#238636' : '#f85149',
                    color: '#fff',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontSize: '9px',
                  }}>
                    exit {output.exitCode}
                  </span>
                )}
              </div>
              <pre style={{
                margin: 0,
                padding: '10px 12px',
                background: '#0d1117',
                borderRadius: '6px',
                fontSize: '11px',
                color: output.stderr ? '#f85149' : '#7ee787',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                maxHeight: '200px',
                overflow: 'auto',
              }}>
                {output.stdout || output.stderr || '(no output)'}
              </pre>
            </div>
          )}

          {call.state === 'running' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#d29922',
              fontSize: '12px',
            }}>
              <div className="spinner" />
              Running...
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .spinner {
          width: 12px;
          height: 12px;
          border: 2px solid #d29922;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

