'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useRef, useEffect, useMemo } from 'react';
import { SandboxChatMessage } from './components/components/SandboxChatMessage';
import { ToolActivityPanel, ToolCall } from './components/components/ToolActivityPanel';
import { MessagesDebug } from './components/components/MessagesDebug';

export default function SandboxChatPage() {
  const [input, setInput] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, sendMessage, setMessages, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/sandbox-chat',
    }),
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Extract tool calls from messages for the activity panel
  const { toolCalls, recitationCount, todoContent } = useMemo(() => {
    const calls: ToolCall[] = [];
    let recitations = 0;
    let latestTodo: string | null = null;

    messages.forEach((msg) => {
      if (msg.role === 'assistant') {
        msg.parts.forEach((part: any, partIndex: number) => {
          if (part.type?.startsWith('tool-')) {
            const command = part.input?.command as string | undefined;
            const result = part.output as { 
              stdout?: string; 
              stderr?: string; 
              exitCode?: number;
              isRecitation?: boolean;
              recitationNumber?: number;
            } | undefined;
            
            const isRecitation = result?.isRecitation || 
              Boolean(command && command.includes('cat todo.md'));
            
            if (isRecitation && result?.recitationNumber) {
              recitations = Math.max(recitations, result.recitationNumber);
            } else if (isRecitation) {
              recitations++;
            }

            // Track todo content
            if (isRecitation && result?.stdout) {
              latestTodo = result.stdout;
            }

            calls.push({
              id: `${msg.id}-${partIndex}`,
              toolName: part.toolName || part.type.replace('tool-', ''),
              input: part.input || {},
              output: result,
              state: part.state === 'result' ? 'completed' : 
                     part.state === 'call' ? 'running' : 'pending',
              timestamp: Date.now() - (messages.length - messages.indexOf(msg)) * 1000,
              isRecitation,
              recitationNumber: result?.recitationNumber,
            });
          }
        });
      }
    });

    return { toolCalls: calls, recitationCount: recitations, todoContent: latestTodo };
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status === 'ready') {
      sendMessage({ text: input });
      setInput('');
    }
  };

  const handleReset = () => {
    setMessages([]);
    // Send a signal to reset the sandbox
    fetch('/api/sandbox-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [], resetSandbox: true }),
    });
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#0d1117',
      color: '#e6edf3',
    }}>
      {/* Main Chat Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        borderRight: '1px solid #30363d',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #30363d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#161b22',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a 
              href="/"
              style={{
                color: '#8b949e',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </a>
            <div>
              <h1 style={{ 
                fontSize: '18px', 
                fontWeight: 600, 
                margin: 0,
                color: '#f0f6fc',
              }}>
                Sandbox Chat
              </h1>
              <p style={{ 
                fontSize: '12px', 
                color: '#8b949e', 
                margin: '2px 0 0 0',
              }}>
                Todo Recitation Pattern Demo
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              fontSize: '12px',
              color: '#8b949e',
              background: '#21262d',
              padding: '6px 12px',
              borderRadius: '6px',
            }}>
              {status === 'ready' ? '● Ready' : 
               status === 'streaming' ? '◌ Streaming...' : 
               status === 'submitted' ? '◌ Processing...' : status}
            </div>
            
            <button
              onClick={() => setShowDebug(!showDebug)}
              style={{
                padding: '8px 16px',
                background: showDebug ? '#238636' : 'transparent',
                border: '1px solid #30363d',
                borderRadius: '6px',
                color: showDebug ? '#fff' : '#8b949e',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              Debug
            </button>
            
            <button
              onClick={handleReset}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid #30363d',
                borderRadius: '6px',
                color: '#f85149',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              Reset
            </button>
          </div>
        </div>

        {/* Messages / Debug Split */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}>
          {/* Messages Area */}
          <div style={{
            flex: showDebug ? '0 0 50%' : 1,
            overflowY: 'auto',
            padding: '24px',
            borderBottom: showDebug ? '1px solid #30363d' : 'none',
          }}>
            {messages.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #238636 0%, #2ea043 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: 600, 
                margin: '0 0 8px 0',
                color: '#f0f6fc',
              }}>
                Sandbox Chat with Todo Recitation
              </h2>
              
              <p style={{ 
                fontSize: '14px', 
                color: '#8b949e', 
                maxWidth: '500px',
                lineHeight: '1.6',
                margin: '0 0 32px 0',
              }}>
                This demo shows the "Todo Recitation" pattern where the AI maintains a todo.md file 
                to stay focused on complex tasks. Watch the Tool Activity panel to see the pattern in action.
              </p>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                width: '100%',
                maxWidth: '400px',
              }}>
                <p style={{ fontSize: '12px', color: '#8b949e', margin: '0 0 8px 0' }}>
                  Try asking:
                </p>
                {[
                  'Analyze all the text files and give me a summary',
                  'What are the key risks and blockers across the documents?',
                  'Create a combined action item list from all files',
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(suggestion);
                    }}
                    style={{
                      padding: '12px 16px',
                      background: '#21262d',
                      border: '1px solid #30363d',
                      borderRadius: '8px',
                      color: '#e6edf3',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#30363d';
                      e.currentTarget.style.borderColor = '#8b949e';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#21262d';
                      e.currentTarget.style.borderColor = '#30363d';
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <SandboxChatMessage
                  key={message.id}
                  message={message as any}
                  status={status}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
          </div>

          {/* Debug Panel */}
          {showDebug && (
            <div style={{
              flex: '0 0 50%',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}>
              <MessagesDebug messages={messages} status={status} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #30363d',
          background: '#161b22',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me to analyze the files..."
              disabled={status !== 'ready'}
              style={{
                flex: 1,
                padding: '14px 18px',
                background: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '8px',
                color: '#e6edf3',
                fontSize: '15px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#238636';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#30363d';
              }}
            />
            
            {status === 'ready' ? (
              <button
                type="submit"
                disabled={!input.trim()}
                style={{
                  padding: '14px 24px',
                  background: input.trim() ? '#238636' : '#21262d',
                  border: 'none',
                  borderRadius: '8px',
                  color: input.trim() ? '#fff' : '#8b949e',
                  fontSize: '15px',
                  fontWeight: 500,
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Send
              </button>
            ) : (
              <button
                type="button"
                onClick={stop}
                style={{
                  padding: '14px 24px',
                  background: '#f85149',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
                Stop
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Tool Activity Panel */}
      <div style={{
        width: '420px',
        flexShrink: 0,
      }}>
        <ToolActivityPanel
          toolCalls={toolCalls}
          recitationCount={recitationCount}
          todoContent={todoContent}
        />
      </div>
    </div>
  );
}

