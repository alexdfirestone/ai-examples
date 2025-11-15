'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import { MessagesDebug } from './components/messages-debug';
import { ModelSelector } from './components/ModelSelector';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ErrorBanner } from './components/ErrorBanner';
import { LoadingIndicator } from './components/LoadingIndicator';

export default function Page() {
  // ============ STATE ============
  const [input, setInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showDevTools, setShowDevTools] = useState(false);
  const [selectedModel, setSelectedModel] = useState('openai/gpt-5-mini');
  
  const { messages, sendMessage, setMessages, status, stop, error, regenerate } = useChat({
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);
      body.model = selectedModel;
      return fetch(input, {
        ...init,
        body: JSON.stringify(body),
      });
    },
  } as any);

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

  // ============ RENDER ============
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'row',
      background: '#fff'
    }}>
      {/* Main Chat Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }}>
        {/* Header */}
        <div style={{ 
          borderBottom: '1px solid #e5e5e5',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <ModelSelector 
            selectedModel={selectedModel} 
            onModelChange={setSelectedModel} 
          />
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
        justifyContent: 'center'
      }}>
        <div style={{
          maxWidth: '800px',
          width: '100%'
        }}>
          {error && <ErrorBanner onReload={handleReload} />}

          {messages.map(message => (
            <ChatMessage
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
      </div>

      {/* Input Area */}
      <ChatInput
        input={input}
        status={status}
        editingMessageId={editingMessageId}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onCancelEdit={handleCancelEdit}
        onStop={stop}
        onRegenerate={handleRegenerate}
        onReset={() => setMessages([])}
      />
    </div>

    {/* Dev Tools Sidebar */}
    {showDevTools && (
      <div style={{ 
        width: '400px',
        borderLeft: '1px solid #e5e5e5',
        background: '#f9f9f9',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ 
          padding: '16px',
          borderBottom: '1px solid #e5e5e5',
          background: '#fff',
          fontWeight: '600',
          fontSize: '14px'
        }}>
          Developer Tools
        </div>
        <MessagesDebug messages={messages} status={status} />
      </div>
    )}
  </div>
  );
}