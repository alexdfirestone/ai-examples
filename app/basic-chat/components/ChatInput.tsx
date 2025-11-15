'use client';

interface ChatInputProps {
  input: string;
  status: string;
  editingMessageId: string | null;
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
  onInputChange,
  onSubmit,
  onCancelEdit,
  onStop,
  onRegenerate,
  onReset
}: ChatInputProps) {
  return (
    <div style={{ 
      borderTop: '1px solid #e5e5e5',
      padding: '16px 20px',
      background: '#fff',
      display: 'flex',
      justifyContent: 'center'
    }}>
      <div style={{
        maxWidth: '800px',
        width: '100%'
      }}>
        {/* Editing notification */}
        {editingMessageId && (
          <div style={{ 
            marginBottom: '12px', 
            padding: '8px 12px', 
            background: '#f9f9f9',
            border: '1px solid #e5e5e5',
            borderRadius: '6px', 
            fontSize: '13px',
            color: '#666'
          }}>
            ✏️ Editing message - all messages from this point will be removed when you send
          </div>
        )}

        {/* Control buttons */}
        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
          <button 
            onClick={onStop}
            disabled={!(status === 'streaming' || status === 'submitted')}
            style={{ 
              padding: '6px 14px', 
              background: status === 'streaming' || status === 'submitted' ? '#000' : '#f0f0f0', 
              color: status === 'streaming' || status === 'submitted' ? '#fff' : '#999',
              border: 'none', 
              borderRadius: '6px',
              cursor: status === 'streaming' || status === 'submitted' ? 'pointer' : 'not-allowed',
              fontSize: '13px'
            }}
          >
            Stop
          </button>
          <button 
            onClick={onRegenerate}
            disabled={!(status === 'ready' || status === 'error')}
            style={{ 
              padding: '6px 14px', 
              background: (status === 'ready' || status === 'error') ? '#000' : '#f0f0f0',
              color: (status === 'ready' || status === 'error') ? '#fff' : '#999',
              border: 'none', 
              borderRadius: '6px',
              cursor: (status === 'ready' || status === 'error') ? 'pointer' : 'not-allowed',
              fontSize: '13px'
            }}
          >
            Regenerate
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            value={input}
            onChange={e => onInputChange(e.target.value)}
            placeholder="Message..."
            disabled={status !== 'ready'}
            style={{ 
              padding: '12px 16px', 
              flex: 1, 
              border: '1px solid #d0d0d0', 
              borderRadius: '12px',
              outline: 'none',
              fontSize: '15px',
              background: '#fff',
              opacity: status !== 'ready' ? 0.6 : 1
            }}
          />
          <button 
            type="submit"
            disabled={status !== 'ready' || !input.trim()}
            style={{ 
              padding: '12px 24px', 
              background: (status === 'ready' && input.trim()) ? '#000' : '#f0f0f0', 
              color: (status === 'ready' && input.trim()) ? '#fff' : '#999', 
              border: 'none', 
              borderRadius: '12px',
              cursor: (status === 'ready' && input.trim()) ? 'pointer' : 'not-allowed',
              fontSize: '15px',
              fontWeight: '500'
            }}
          >
            {editingMessageId ? 'Update' : 'Send'}
          </button>
          {editingMessageId ? (
            <button 
              type="button" 
              onClick={onCancelEdit}
              style={{ 
                padding: '12px 20px', 
                background: '#fff', 
                color: '#000', 
                border: '1px solid #d0d0d0', 
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '15px'
              }}
            >
              Cancel
            </button>
          ) : (
            <button 
              type="button" 
              onClick={onReset}
              style={{ 
                padding: '12px 20px', 
                background: '#fff', 
                color: '#000', 
                border: '1px solid #d0d0d0', 
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '15px'
              }}
            >
              Reset
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

