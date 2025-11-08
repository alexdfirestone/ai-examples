'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import { Weather, type WeatherProps } from './components/weather';
import { MessagesDebug } from './components/messages-debug';

export default function Page() {
  const [input, setInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const { messages, sendMessage, setMessages, status, stop, error, regenerate } = useChat();

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

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Status indicator */}
      <div style={{ marginBottom: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '5px', fontSize: '14px' }}>
        <strong>Status:</strong> {status}
      </div>

      {/* Error state */}
      {error && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          background: '#fee', 
          border: '1px solid #fcc',
          borderRadius: '5px',
          color: '#c00'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>⚠️ An error occurred</div>
          <div style={{ fontSize: '14px', marginBottom: '10px' }}>Something went wrong. Please try again.</div>
          <button 
            onClick={handleReload}
            style={{ 
              padding: '8px 16px', 
              background: '#c00', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Messages */}
      {messages.map(message => (
        <div key={message.id} style={{ marginBottom: '20px', padding: '10px', background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: '5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <div style={{ fontWeight: 'bold' }}>{message.role === 'user' ? 'User: ' : 'AI: '}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {message.role === 'user' && (
                <button
                  onClick={() => handleEdit(message.id)}
                  disabled={status !== 'ready'}
                  style={{
                    padding: '4px 8px',
                    background: '#fff',
                    color: '#007bff',
                    border: '1px solid #007bff',
                    borderRadius: '4px',
                    cursor: status === 'ready' ? 'pointer' : 'not-allowed',
                    fontSize: '12px',
                    opacity: status === 'ready' ? 1 : 0.5
                  }}
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => handleDelete(message.id)}
                style={{
                  padding: '4px 8px',
                  background: '#fff',
                  color: '#c00',
                  border: '1px solid #c00',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Delete
              </button>
            </div>
          </div>
          <div>
            {message.parts.map((part, index) => {
              if (part.type === 'step-start') {
                return null; // Just a marker
              }

              if (part.type === 'reasoning') {
                const isInProgress = 'state' in part && part.state !== 'done';
                return isInProgress ? <div key={index} style={{ color: '#888' }}>Thinking...</div> : null;
              }

              if (part.type === 'text') {
                return <span key={index}>{part.text}</span>;
              }

              if (part.type === 'tool-displayWeather') {
                switch (part.state) {
                  case 'input-available':
                    return <div key={index}>Loading weather...</div>;
                  case 'output-available':
                    return (
                      <div key={index}>
                        <Weather {...(part.output as WeatherProps)} />
                      </div>
                    );
                  case 'output-error':
                    return <div key={index}>Error: {part.errorText}</div>;
                  default:
                    return null;
                }
              }

              return null;
            })}
          </div>
        </div>
      ))}

      {/* Loading skeleton - only show if we're waiting and the last message isn't an assistant message */}
      {(status === 'submitted' || status === 'streaming') && 
        messages[messages.length - 1]?.role !== 'assistant' && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '10px', 
          background: '#f5f5f5', 
          border: '1px solid #e0e0e0', 
          borderRadius: '5px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>AI: </div>
          <div style={{ color: '#888' }}>
            Loading...
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px', marginBottom: '30px' }}>
        <MessagesDebug messages={messages} />
      </div>

      {/* Control buttons */}
      <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
        <button 
          onClick={stop}
          disabled={!(status === 'streaming' || status === 'submitted')}
          style={{ 
            padding: '8px 16px', 
            background: status === 'streaming' || status === 'submitted' ? '#c00' : '#ccc', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px',
            cursor: status === 'streaming' || status === 'submitted' ? 'pointer' : 'not-allowed',
            fontSize: '14px'
          }}
        >
          Stop
        </button>
        <button 
          onClick={handleRegenerate}
          disabled={!(status === 'ready' || status === 'error')}
          style={{ 
            padding: '8px 16px', 
            background: (status === 'ready' || status === 'error') ? '#007bff' : '#ccc', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px',
            cursor: (status === 'ready' || status === 'error') ? 'pointer' : 'not-allowed',
            fontSize: '14px'
          }}
        >
          Regenerate
        </button>
      </div>

      {/* Form */}
      {editingMessageId && (
        <div style={{ marginBottom: '10px', padding: '10px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '5px', fontSize: '14px' }}>
          ✏️ Editing message - all messages from this point will be removed when you send
        </div>
      )}
      <form onSubmit={handleSubmit} style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={status !== 'ready'}
          style={{ 
            padding: '10px', 
            flex: 1, 
            border: '1px solid #ddd', 
            borderRadius: '4px',
            opacity: status !== 'ready' ? 0.6 : 1
          }}
        />
        <button 
          type="submit"
          disabled={status !== 'ready'}
          style={{ 
            padding: '10px 20px', 
            background: status === 'ready' ? '#000' : '#ccc', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px',
            cursor: status === 'ready' ? 'pointer' : 'not-allowed'
          }}
        >
          {editingMessageId ? 'Update' : 'Send'}
        </button>
        {editingMessageId ? (
          <button 
            type="button" 
            onClick={handleCancelEdit}
            style={{ 
              padding: '10px 20px', 
              background: '#fff', 
              color: '#000', 
              border: '1px solid #000', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        ) : (
          <button 
            type="button" 
            onClick={() => setMessages([])} 
            style={{ 
              padding: '10px 20px', 
              background: '#fff', 
              color: '#000', 
              border: '1px solid #000', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
        )}
      </form>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}