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
      // Collect all updates first, then apply once
      let newWindow = null;
      let newBlocks = null;
      let hasUpdates = false;

      // Look through parts for tool outputs
      for (const part of latestAssistantMessage.parts) {
        const partAny = part as any;
        if (partAny.type?.startsWith('tool-') && partAny.state === 'output-available') {
          const output = partAny.output as any;
          
          // Collect updates
          if (output?.window !== undefined) {
            newWindow = output.window;
            hasUpdates = true;
          }
          if (output?.blocks !== undefined) {
            newBlocks = output.blocks;
            hasUpdates = true;
          }
        }
      }

      // Apply all updates at once, only if there were changes
      if (hasUpdates) {
        setScheduleState(prev => ({
          window: newWindow !== null ? newWindow : prev.window,
          blocks: newBlocks !== null ? newBlocks : prev.blocks
        }));
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
      sendMessage({ 
        text: input,
        metadata: { scheduleState } // Send current state with each message
      });
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
        sendMessage({ 
          text: textPart.text,
          metadata: { scheduleState }
        });
      }
    }
  };

  const handleRegenerate = () => {
    regenerate();
  };

  const handleScheduleAction = (message: string) => {
    setInput(message);
    // Auto-send the message
    sendMessage({ 
      text: message,
      metadata: { scheduleState }
    });
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
          height: '56px',
          padding: '0 16px',
          borderBottom: '1px solid #e0e0e0',
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <button
            onClick={() => setMessages([])}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid #d0d0d0',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Reset Chat"
          >
            ↻
          </button>
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
            {showDevTools ? 'Hide Dev Tools' : 'Show Dev Tools'}
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
              hasMessages={messages.length > 0}
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
                <ResizablePanel defaultSize={50} minSize={20}>
                  <div style={{ 
                    height: '100%',
                    overflowY: 'auto',
                    background: '#fff'
                  }}>
                    <AccordionItem defaultOpen={true}>
                      <AccordionTrigger>Mock Data</AccordionTrigger>
                      <AccordionContent>
                        <div style={{ 
                          padding: '0 16px 16px'
                        }}>
                          <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                            Load example schedule:
                          </div>
                          <select
                            value={selectedExample}
                            onChange={(e) => handleExampleChange(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              fontSize: '12px',
                              border: '1px solid #e0e0e0',
                              borderRadius: '4px',
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
                      </AccordionContent>
                    </AccordionItem>

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
                <ResizablePanel defaultSize={50} minSize={20}>
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

