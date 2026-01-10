'use client';

import { useState } from 'react';

interface SandboxChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    parts: Array<{
      type: string;
      text?: string;
      toolName?: string;
      input?: Record<string, unknown>;
      output?: Record<string, unknown>;
      state?: string;
    }>;
  };
  status: string;
}

export function SandboxChatMessage({ message, status }: SandboxChatMessageProps) {
  const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set());

  const toggleTool = (index: number) => {
    setExpandedTools(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const isUser = message.role === 'user';

  return (
    <div style={{
      marginBottom: '24px',
      display: 'flex',
      gap: '12px',
      ...(isUser ? {
        justifyContent: 'flex-end',
        paddingLeft: '15%',
      } : {
        justifyContent: 'flex-start',
        paddingRight: '10%',
      }),
    }}>
      {/* Avatar for assistant */}
      {!isUser && (
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #238636 0%, #2ea043 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
      )}

      {/* Message content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '100%',
        minWidth: 0,
      }}>
        {message.parts.map((part, index) => {
          // Skip step-start parts
          if (part.type === 'step-start') {
            return null;
          }

          // Reasoning indicator
          if (part.type === 'reasoning') {
            const isInProgress = part.state !== 'done';
            return isInProgress ? (
              <div key={index} style={{
                color: '#8b949e',
                fontSize: '13px',
                fontStyle: 'italic',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid #8b949e',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Thinking...
              </div>
            ) : null;
          }

          // Text content
          if (part.type === 'text' && part.text) {
            return (
              <div key={index} style={{
                padding: isUser ? '12px 16px' : '0',
                background: isUser ? '#238636' : 'transparent',
                borderRadius: isUser ? '18px 18px 4px 18px' : '0',
                color: isUser ? '#fff' : '#e6edf3',
                fontSize: '15px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
              }}>
                {part.text}
              </div>
            );
          }

          // Tool call - inline display
          if (part.type.startsWith('tool-')) {
            const toolName = part.toolName || part.type.replace('tool-', '');
            const isExpanded = expandedTools.has(index);
            const command = (part.input as { command?: string })?.command;
            const result = part.output as { stdout?: string; stderr?: string; exitCode?: number; isRecitation?: boolean } | undefined;
            const isRecitation = result?.isRecitation || command?.includes('cat todo.md');
            const isRunning = part.state === 'partial' || part.state === 'call';

            return (
              <div key={index} style={{
                background: isRecitation ? '#0f2d1e' : '#161b22',
                border: `1px solid ${isRecitation ? '#238636' : '#30363d'}`,
                borderRadius: '8px',
                overflow: 'hidden',
                fontSize: '13px',
              }}>
                {/* Tool header */}
                <div
                  onClick={() => toggleTool(index)}
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: isRecitation ? 'rgba(35, 134, 54, 0.1)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Status dot */}
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: isRunning ? '#d29922' : 
                                 result?.exitCode === 0 ? '#238636' : 
                                 result?.exitCode ? '#f85149' : '#8b949e',
                      animation: isRunning ? 'pulse 1.5s infinite' : 'none',
                    }} />
                    
                    {/* Tool icon */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isRecitation ? '#7ee787' : '#8b949e'} strokeWidth="2">
                      <polyline points="4 17 10 11 4 5"/>
                      <line x1="12" y1="19" x2="20" y2="19"/>
                    </svg>
                    
                    {isRecitation && (
                      <span style={{
                        fontSize: '10px',
                        background: '#238636',
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 600,
                      }}>
                        RECITATION
                      </span>
                    )}
                    
                    {/* Command preview */}
                    <code style={{
                      color: isRecitation ? '#7ee787' : '#79c0ff',
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                      maxWidth: '300px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {command?.substring(0, 50)}{command && command.length > 50 ? '...' : ''}
                    </code>
                  </div>

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

                {/* Expanded output */}
                {isExpanded && (
                  <div style={{
                    padding: '12px 14px',
                    borderTop: `1px solid ${isRecitation ? '#238636' : '#30363d'}`,
                  }}>
                    {command && (
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ 
                          fontSize: '10px', 
                          color: '#8b949e', 
                          marginBottom: '4px',
                          textTransform: 'uppercase',
                        }}>
                          Command
                        </div>
                        <pre style={{
                          margin: 0,
                          padding: '8px 10px',
                          background: '#0d1117',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#79c0ff',
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                        }}>
                          $ {command}
                        </pre>
                      </div>
                    )}

                    {result && (
                      <div>
                        <div style={{ 
                          fontSize: '10px', 
                          color: '#8b949e', 
                          marginBottom: '4px',
                          textTransform: 'uppercase',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}>
                          Output
                          {result.exitCode !== undefined && (
                            <span style={{
                              background: result.exitCode === 0 ? '#238636' : '#f85149',
                              color: '#fff',
                              padding: '1px 6px',
                              borderRadius: '3px',
                              fontSize: '9px',
                            }}>
                              exit {result.exitCode}
                            </span>
                          )}
                        </div>
                        <pre style={{
                          margin: 0,
                          padding: '8px 10px',
                          background: '#0d1117',
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: result.stderr ? '#f85149' : '#7ee787',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '150px',
                          overflow: 'auto',
                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                        }}>
                          {result.stdout || result.stderr || '(no output)'}
                        </pre>
                      </div>
                    )}

                    {isRunning && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#d29922',
                        fontSize: '12px',
                        marginTop: '8px',
                      }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          border: '2px solid #d29922',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                        }} />
                        Executing...
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* Avatar for user */}
      {isUser && (
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: '#30363d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e6edf3" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}


