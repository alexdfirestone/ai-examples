'use client';

interface PlannerChatMessageProps {
  message: any;
  status: string;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export function PlannerChatMessage({ message, status, onDelete, onEdit }: PlannerChatMessageProps) {
  return (
    <div 
      style={{ 
        marginBottom: '24px',
        display: 'flex',
        gap: '12px',
        position: 'relative',
        width: '100%',
        ...(message.role === 'user' ? {
          justifyContent: 'flex-end',
        } : {
          justifyContent: 'flex-start',
        })
      }}
      onMouseEnter={(e) => {
        const buttons = e.currentTarget.querySelector('[data-action-buttons]') as HTMLElement;
        if (buttons) buttons.style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        const buttons = e.currentTarget.querySelector('[data-action-buttons]') as HTMLElement;
        if (buttons) buttons.style.opacity = '0';
      }}
    >
      {/* Avatar - only show for AI messages on left */}
      {message.role === 'assistant' && (
        <div style={{ 
          width: '32px', 
          height: '32px', 
          borderRadius: '50%', 
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 0L14 14H0L7 0Z" fill="white"/>
          </svg>
        </div>
      )}
      
      {/* Message content */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
        maxWidth: '80%'
      }}>
        <div style={{ 
          fontSize: '15px', 
          lineHeight: '1.6', 
          color: '#000',
          width: '100%',
          ...(message.role === 'user' ? {
            background: '#f4f4f4',
            padding: '12px 16px',
            borderRadius: '18px',
          } : {})
        }}>
          {message.parts.map((part: any, index: number) => {
            if (part.type === 'step-start') {
              return null;
            }

            if (part.type === 'reasoning') {
              const isInProgress = 'state' in part && part.state !== 'done';
              return isInProgress ? (
                <div key={index} style={{ color: '#999', fontStyle: 'italic', marginBottom: '8px' }}>
                  Thinking...
                </div>
              ) : null;
            }

            if (part.type === 'text') {
              return <div key={index} style={{ whiteSpace: 'pre-wrap' }}>{part.text}</div>;
            }

            // Handle tool calls
            if (part.type?.startsWith('tool-')) {
              const toolName = part.type.replace('tool-', '');
              
              switch (part.state) {
                case 'input-available':
                  return (
                    <div key={index} style={{ 
                      marginTop: '8px',
                      padding: '10px 12px',
                      background: '#f9f9f9',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#666',
                      border: '1px solid #e5e5e5'
                    }}>
                      🔄 Using {toolName.replace('_', ' ')}...
                    </div>
                  );
                  
                case 'output-available':
                  return (
                    <div key={index} style={{ 
                      marginTop: '8px',
                      padding: '10px 12px',
                      background: '#e8f5e9',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#2e7d32',
                      border: '1px solid #c8e6c9'
                    }}>
                      ✓ {toolName === 'mutate_timeline' && 'Timeline updated'}
                      {toolName === 'mutate_blocks' && part.output?.message}
                      {toolName === 'web_research' && 'Search completed'}
                      {toolName === 'ask_followup' && 'Question asked'}
                    </div>
                  );
                  
                case 'output-error':
                  return (
                    <div key={index} style={{ 
                      marginTop: '8px',
                      padding: '10px 12px',
                      background: '#ffebee',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#c62828',
                      border: '1px solid #ffcdd2'
                    }}>
                      ✗ Error: {part.errorText}
                    </div>
                  );
                  
                default:
                  return null;
              }
            }

            return null;
          })}
        </div>

        {/* Action buttons */}
        <div 
          data-action-buttons
          style={{ 
            marginTop: '8px',
            display: 'flex',
            gap: '8px',
            opacity: 0,
            transition: 'opacity 0.2s'
          }}
        >
          {message.role === 'user' && (
            <button
              onClick={() => onEdit(message.id)}
              disabled={status !== 'ready'}
              style={{
                padding: '4px 10px',
                background: 'transparent',
                border: '1px solid #d0d0d0',
                borderRadius: '6px',
                cursor: status === 'ready' ? 'pointer' : 'not-allowed',
                fontSize: '12px',
                color: '#666',
                opacity: status === 'ready' ? 1 : 0.5
              }}
            >
              Edit
            </button>
          )}
          <button
            onClick={() => onDelete(message.id)}
            style={{
              padding: '4px 10px',
              background: 'transparent',
              border: '1px solid #d0d0d0',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#666'
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Avatar - only show for user messages on right */}
      {message.role === 'user' && (
        <div style={{ 
          width: '32px', 
          height: '32px', 
          borderRadius: '50%', 
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8Z" fill="white"/>
            <path d="M12 10C12 9.44772 11.5523 9 11 9H5C4.44772 9 4 9.44772 4 10V11C4 12.6569 5.34315 14 7 14H9C10.6569 14 12 12.6569 12 11V10Z" fill="white"/>
          </svg>
        </div>
      )}
    </div>
  );
}

