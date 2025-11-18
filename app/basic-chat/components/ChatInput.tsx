'use client';

import { useRef, useEffect } from 'react';

interface ChatInputProps {
  input: string;
  status: string;
  editingMessageId: string | null;
  hasMessages: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancelEdit: () => void;
  onStop: () => void;
  onRegenerate: () => void;
  onReset: () => void;
}

export function ChatInput({
  input,
  status,
  editingMessageId,
  hasMessages,
  onInputChange,
  onSubmit,
  onCancelEdit,
  onStop,
  onRegenerate,
  onReset
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as content changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (status === 'ready' && input.trim()) {
        onSubmit(e as any);
      }
    }
  };

  const isStreaming = status === 'streaming' || status === 'submitted';
  const canSend = status === 'ready' && input.trim();
  const canRegenerate = hasMessages && (status === 'ready' || status === 'error');

  return (
    <div style={{ 
      padding: '20px',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px'
    }}>
      {/* Input container */}
      <div style={{
        maxWidth: '768px',
        width: '100%',
        position: 'relative'
      }}>
        {/* Regenerate button - compact, inline with input */}
        {canRegenerate && !isStreaming && !editingMessageId && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
            <button 
              onClick={onRegenerate}
              style={{ 
                padding: '4px 12px',
                background: 'transparent',
                color: '#666',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fafafa';
                e.currentTarget.style.borderColor = '#d0d0d0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = '#e0e0e0';
              }}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 7C13 10.3137 10.3137 13 7 13C3.68629 13 1 10.3137 1 7C1 3.68629 3.68629 1 7 1C9.5 1 11.6 2.5 12.5 4.5" />
                <path d="M13 1V4.5H9.5" />
              </svg>
              Regenerate
            </button>
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div style={{
            position: 'relative',
            background: '#fff',
            border: '1px solid #d0d0d0',
            borderRadius: '24px',
            boxShadow: '0 0 0 0 rgba(0,0,0,0.05)',
            transition: 'box-shadow 0.2s, border-color 0.2s',
            paddingRight: '52px'
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              disabled={!status || status === 'streaming' || status === 'submitted'}
              rows={1}
              style={{ 
                width: '100%',
                padding: '14px 16px',
                border: 'none',
                borderRadius: '24px',
                outline: 'none',
                fontSize: '15px',
                lineHeight: '1.5',
                background: 'transparent',
                resize: 'none',
                fontFamily: 'inherit',
                maxHeight: '200px',
                overflow: 'auto'
              }}
            />
            
            {/* Stop button when streaming, Send button otherwise */}
            {isStreaming ? (
              <button 
                type="button"
                onClick={onStop}
                style={{ 
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  width: '36px',
                  height: '36px',
                  background: '#000',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <rect width="14" height="14" rx="2" />
                </svg>
              </button>
            ) : (
              <button 
                type="submit"
                disabled={!canSend}
                style={{ 
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  width: '36px',
                  height: '36px',
                  background: canSend ? '#000' : '#f0f0f0',
                  color: canSend ? '#fff' : '#999',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: canSend ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 4L10 16M10 4L6 8M10 4L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

