'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';
import { ScheduleView } from './components/ScheduleView';
import { PlannerChatMessage } from './components/PlannerChatMessage';
import { ChatInput } from '../basic-chat/components/ChatInput';
import { ErrorBanner } from '../basic-chat/components/ErrorBanner';
import { LoadingIndicator } from '../basic-chat/components/LoadingIndicator';
import { MessagesDebug } from '../basic-chat/components/messages-debug';
import type { ScheduleState } from '../api/schedule-planner/tools';
import { DefaultChatTransport } from 'ai';
import { exampleSchedules } from './utils/example-schedules';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export default function PlannerPage() {
  // ============ STATE ============
  const [input, setInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showDevTools, setShowDevTools] = useState(false);
  const [selectedExample, setSelectedExample] = useState<string>('empty');
  const [scheduleState, setScheduleState] = useState<ScheduleState>(exampleSchedules['empty']);

  const { messages, sendMessage, setMessages, status, stop, error, regenerate } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/schedule-planner',
    }),
  });

  // ============ SYNC STATE FROM TOOL OUTPUTS ============
  useEffect(() => {
    // Extract schedule state from assistant messages with tool outputs
    const latestAssistantMessage = [...messages]
      .reverse()
      .find(m => m.role === 'assistant');

    if (latestAssistantMessage) {
      // Look through parts for tool outputs
      for (const part of latestAssistantMessage.parts) {
        const partAny = part as any;
        if (partAny.type?.startsWith('tool-') && partAny.state === 'output-available') {
          const output = partAny.output as any;
          
          // Update schedule state if tool returned blocks or window
          if (output?.blocks !== undefined || output?.window !== undefined) {
            setScheduleState(prev => ({
              window: output.window || prev.window,
              blocks: output.blocks || prev.blocks
            }));
          }
        }
      }
    }
  }, [messages]);

  // ============ HANDLERS ============

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      // If editing, delete all messages from that point forward
      if (editingMessageId) {
        const editIndex = messages.findIndex(m => m.id === editingMessageId);
        if (editIndex !== -1) {
          setMessages(messages.slice(0, editIndex));
        }
        setEditingMessageId(null);
      }
      sendMessage({ text: input });
      setInput('');
    }
  };

  const handleDelete = (id: string) => {
    setMessages(messages.filter(message => message.id !== id));
  };

  const handleEdit = (id: string) => {
    const message = messages.find(m => m.id === id);
    if (message) {
      const textPart = message.parts.find(p => p.type === 'text');
      if (textPart && 'text' in textPart) {
        setInput(textPart.text);
        setEditingMessageId(id);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setInput('');
  };

  const handleReload = () => {
    // Retry by resending the last user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (lastUserMessage) {
      const textPart = lastUserMessage.parts.find(p => p.type === 'text');
      if (textPart && 'text' in textPart) {
        sendMessage({ text: textPart.text });
      }
    }
  };

  const handleRegenerate = () => {
    regenerate();
  };

  const handleScheduleAction = (message: string) => {
    setInput(message);
    // Auto-send the message
    sendMessage({ text: message });
  };

  const handleExampleChange = (example: string) => {
    setSelectedExample(example);
    setScheduleState(exampleSchedules[example]);
  };

  // ============ RENDER ============
  return (
    <ResizablePanelGroup
      direction="horizontal"
      style={{ height: '100vh', background: '#fff' }}
    >
      {/* Schedule View (Left/Main Panel) */}
      <ResizablePanel defaultSize={50} minSize={25}>
        <div style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden'
        }}>
          {/* Example Selector */}
          <div style={{
            padding: '8px 14px',
            borderBottom: '1px solid #e0e0e0',
            background: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0
          }}>
            <span style={{ fontSize: '11px', color: '#666', fontWeight: '400' }}>Example:</span>
            <select
              value={selectedExample}
              onChange={(e) => handleExampleChange(e.target.value)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                border: '1px solid #e0e0e0',
                borderRadius: '3px',
                background: '#fff',
                cursor: 'pointer',
                color: '#000'
              }}
            >
              <option value="empty">Empty</option>
              <option value="2-day">2 Days</option>
              <option value="5-day">5 Days</option>
              <option value="1-week">1 Week</option>
              <option value="2-week">2 Weeks</option>
              <option value="1-month">1 Month</option>
            </select>
          </div>
          
          <ScheduleView 
            window={scheduleState.window}
            blocks={scheduleState.blocks}
            onSendMessage={handleScheduleAction}
          />
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Chat Panel (Right) */}
      <ResizablePanel defaultSize={showDevTools ? 35 : 50} minSize={25}>
        <div style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden'
        }}>
        {/* Chat Header */}
        <div style={{ 
          borderBottom: '1px solid #e5e5e5',
          padding: '20px 24px',
          background: '#fafafa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div>
            <h2 style={{ 
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '4px'
            }}>
              AI Assistant
            </h2>
            <p style={{ 
              margin: 0,
              fontSize: '14px',
              color: '#666'
            }}>
              Chat to build your schedule
            </p>
          </div>
          <button
            onClick={() => setShowDevTools(!showDevTools)}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid #d0d0d0',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#666'
            }}
          >
            {showDevTools ? '✕ Dev Tools' : '⚙ Dev Tools'}
          </button>
        </div>

        {/* Messages Container */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          {error && <ErrorBanner onReload={handleReload} />}

          {messages.length === 0 && (
            <div style={{ 
              textAlign: 'center',
              padding: '40px 20px',
              color: '#999'
            }}>
              <div style={{ fontSize: '36px', marginBottom: '16px' }}>💬</div>
              <div style={{ fontSize: '16px', marginBottom: '8px' }}>
                Start planning!
              </div>
              <div style={{ fontSize: '14px', marginBottom: '20px' }}>
                Try: "Plan a 3-day trip to Tokyo" or "Schedule a team offsite"
              </div>
              
              {/* Quick start suggestions */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                alignItems: 'center'
              }}>
                {[
                  'Plan a 3-day trip to Tokyo from May 6-8',
                  'Schedule a team offsite in San Francisco',
                  'Create a weekend itinerary for NYC'
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(suggestion);
                      sendMessage({ text: suggestion });
                    }}
                    style={{
                      padding: '10px 16px',
                      background: '#f4f4f4',
                      border: '1px solid #d0d0d0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#333',
                      maxWidth: '400px'
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(message => (
            <PlannerChatMessage
              key={message.id}
              message={message}
              status={status}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}

          {(status === 'submitted' || status === 'streaming') && 
            messages[messages.length - 1]?.role !== 'assistant' && (
            <LoadingIndicator />
          )}
        </div>

          {/* Input Area */}
          <div style={{ flexShrink: 0 }}>
            <ChatInput
              input={input}
              status={status}
              editingMessageId={editingMessageId}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              onCancelEdit={handleCancelEdit}
              onStop={stop}
              onRegenerate={handleRegenerate}
              onReset={() => {
                setMessages([]);
                setScheduleState({ window: {}, blocks: [] });
              }}
            />
          </div>
        </div>
      </ResizablePanel>

      {/* Dev Tools Sidebar */}
      {showDevTools && (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={15} minSize={15} maxSize={40}>
            <div style={{ 
              height: '100%',
              background: '#f9f9f9',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden'
            }}>
              {/* Header */}
              <div style={{ 
                padding: '16px',
                borderBottom: '1px solid #e5e5e5',
                background: '#fff',
                fontWeight: '600',
                fontSize: '14px',
                flexShrink: 0
              }}>
                Developer Tools
              </div>
              
              {/* Vertical Resizable Group */}
              <ResizablePanelGroup direction="vertical" style={{ flex: 1, minHeight: 0 }}>
                {/* Schedule State Panel */}
                <ResizablePanel defaultSize={40} minSize={20}>
                  <div style={{ 
                    height: '100%',
                    overflowY: 'auto',
                    background: '#fff'
                  }}>
                    <AccordionItem defaultOpen={true}>
                      <AccordionTrigger>Schedule State</AccordionTrigger>
                      <AccordionContent>
                        <div style={{ 
                          padding: '0 16px 16px',
                          fontFamily: 'monospace',
                          fontSize: '12px'
                        }}>
                          <pre style={{ 
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word'
                          }}>
                            {JSON.stringify(scheduleState, null, 2)}
                          </pre>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Messages Debug Panel */}
                <ResizablePanel defaultSize={60} minSize={20}>
                  <div style={{ 
                    height: '100%',
                    overflowY: 'auto'
                  }}>
                    <MessagesDebug messages={messages} status={status} />
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}

