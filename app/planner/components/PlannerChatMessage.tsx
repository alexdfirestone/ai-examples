'use client';

import { useState } from 'react';

// ============================================================================
// Types
// ============================================================================

interface PlannerChatMessageProps {
  message: any;
  status: string;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

interface MessagePart {
  type: string;
  text?: string;
  state?: string;
  input?: any;
  output?: any;
  errorText?: string;
}

// ============================================================================
// Constants
// ============================================================================

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  mutate_timeline: 'Timeline',
  mutate_blocks: 'Schedule Blocks',
  web_research: 'Web Research',
  ask_followup: 'Follow-up Question',
};

const TOOL_SUCCESS_MESSAGES: Record<string, string> = {
  mutate_timeline: 'Timeline updated',
  web_research: 'Search completed',
  ask_followup: 'Questions',
};

// ============================================================================
// Subcomponents
// ============================================================================

function Avatar({ role }: { role: 'user' | 'assistant' }) {
  const isAssistant = role === 'assistant';
  
  return (
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
      {isAssistant ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 0L14 14H0L7 0Z" fill="white"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8Z" fill="white"/>
          <path d="M12 10C12 9.44772 11.5523 9 11 9H5C4.44772 9 4 9.44772 4 10V11C4 12.6569 5.34315 14 7 14H9C10.6569 14 12 12.6569 12 11V10Z" fill="white"/>
        </svg>
      )}
    </div>
  );
}

function ToolIcon({ toolName }: { toolName: string }) {
  const iconStyle = { width: '14px', height: '14px', flexShrink: 0 };
  
  switch (toolName) {
    case 'mutate_timeline':
      return (
        <svg style={iconStyle} viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M7 4V7L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'mutate_blocks':
      return (
        <svg style={iconStyle} viewBox="0 0 14 14" fill="none">
          <rect x="2" y="2" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="8" y="2" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="2" y="8" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="8" y="8" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      );
    case 'web_search':
      return (
        <svg style={iconStyle} viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M9 9L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case 'ask_followup':
      return (
        <svg style={iconStyle} viewBox="0 0 14 14" fill="none">
          <path d="M7 10.5V10.5M7 8C7 8 7 7.5 7 7C7 5.89543 7.89543 5 9 5C10.1046 5 11 5.89543 11 7C11 7.5 10.5 8 10 8.5C9.5 9 9 9 9 10" 
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(-2, -1) scale(0.85)"/>
        </svg>
      );
    default:
      return (
        <svg style={iconStyle} viewBox="0 0 14 14" fill="none">
          <path d="M7 3V11M3 7H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
  }
}

function ToolCallInProgress({ toolName, input }: { toolName: string; input?: any }) {
  const displayName = TOOL_DISPLAY_NAMES[toolName] || toolName.replace(/_/g, ' ');
  
  // Extract query for display
  let queryText = '';
  if (toolName === 'web_search' && input?.query) {
    queryText = input.query;
  } else if (toolName === 'ask_followup' && input?.questions) {
    queryText = `${input.questions.length} question${input.questions.length !== 1 ? 's' : ''}`;
  }
  
  return (
    <div style={{ 
      marginTop: '8px',
      padding: '8px 12px',
      background: 'rgba(0, 0, 0, 0.02)',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#666',
      borderLeft: '2px solid #e0e0e0',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <div style={{
        width: '4px',
        height: '4px',
        borderRadius: '50%',
        background: '#999',
        animation: 'pulse 1.5s ease-in-out infinite'
      }} />
      <ToolIcon toolName={toolName} />
      <span>{displayName}</span>
      {queryText && <span style={{ color: '#999' }}>· {queryText}</span>}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function ToolCallSuccess({ toolName, input, output }: { toolName: string; input?: any; output?: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayName = TOOL_DISPLAY_NAMES[toolName] || toolName.replace(/_/g, ' ');
  
  // Special handling for follow-up questions - display as bullet points
  if (toolName === 'ask_followup' && output?.questions && Array.isArray(output.questions)) {
    return (
      <div style={{ marginTop: '8px' }}>
        <div style={{ 
          padding: '8px 12px',
          background: 'rgba(0, 0, 0, 0.02)',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#171717',
          borderLeft: '2px solid #000',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'fit-content', paddingTop: '2px' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M10 3L4.5 8.5L2 6" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <ToolIcon toolName={toolName} />
            <span style={{ fontWeight: 500 }}>{displayName}</span>
          </div>
        </div>
        <div style={{ 
          marginTop: '12px',
          paddingLeft: '0px'
        }}>
          <ul style={{ 
            margin: 0,
            paddingLeft: '20px',
            listStyle: 'disc',
            color: '#171717'
          }}>
            {output.questions.map((question: string, idx: number) => (
              <li key={idx} style={{ 
                marginBottom: idx < output.questions.length - 1 ? '8px' : '0',
                lineHeight: '1.5',
                fontSize: '15px'
              }}>
                {question}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  
  // Get display message for other tools
  let message = '';
  let hasExpandableContent = false;
  
  if (toolName === 'web_search') {
    // For web search, show truncated query and have accordion for results
    const query = input?.query || '';
    message = query.length > 50 ? query.slice(0, 50) + '...' : query;
    hasExpandableContent = output?.results && output.results.length > 0;
  } else if (output?.displayMessage) {
    message = output.displayMessage;
  } else if (toolName === 'mutate_blocks' && output?.message) {
    message = output.message;
  } else {
    message = TOOL_SUCCESS_MESSAGES[toolName] || 'Completed';
  }
  
  return (
    <div style={{ marginTop: '8px' }}>
      <div 
        style={{ 
          padding: '8px 12px',
          background: 'rgba(0, 0, 0, 0.02)',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#171717',
          borderLeft: '2px solid #000',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: hasExpandableContent ? 'pointer' : 'default'
        }}
        onClick={() => hasExpandableContent && setIsExpanded(!isExpanded)}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M10 3L4.5 8.5L2 6" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <ToolIcon toolName={toolName} />
        <span style={{ fontWeight: 500 }}>{displayName}</span>
        {message && (
          <span style={{ 
            color: '#666',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1
          }}>
            · {message}
          </span>
        )}
        {hasExpandableContent && (
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 12 12" 
            fill="none"
            style={{ 
              flexShrink: 0,
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          >
            <path d="M3 5L6 8L9 5" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      
      {/* Accordion content for web search */}
      {hasExpandableContent && isExpanded && toolName === 'web_search' && (
        <div style={{
          marginTop: '4px',
          padding: '12px',
          background: 'rgba(0, 0, 0, 0.01)',
          borderRadius: '8px',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          fontSize: '12px'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '8px', color: '#171717' }}>
            Search Results
          </div>
          {output.results?.slice(0, 3).map((result: any, idx: number) => (
            <div key={idx} style={{ 
              marginBottom: idx < 2 ? '10px' : '0',
              paddingBottom: idx < 2 ? '10px' : '0',
              borderBottom: idx < 2 ? '1px solid rgba(0, 0, 0, 0.06)' : 'none'
            }}>
              <a 
                href={result.url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: '#171717',
                  textDecoration: 'none',
                  fontWeight: 500,
                  display: 'block',
                  marginBottom: '4px'
                }}
              >
                {result.title}
              </a>
              {result.snippet && (
                <div style={{ color: '#666', lineHeight: '1.4' }}>
                  {result.snippet}
                </div>
              )}
              <div style={{ color: '#999', fontSize: '11px', marginTop: '4px' }}>
                {result.url}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolCallError({ toolName, errorText }: { toolName: string; errorText?: string }) {
  const displayName = TOOL_DISPLAY_NAMES[toolName] || toolName.replace(/_/g, ' ');
  
  return (
    <div style={{ 
      marginTop: '8px',
      padding: '8px 12px',
      background: 'rgba(239, 68, 68, 0.05)',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#dc2626',
      borderLeft: '2px solid #dc2626',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 4V6.5M6 8.5H6.005M11 6C11 8.76142 8.76142 11 6 11C3.23858 11 1 8.76142 1 6C1 3.23858 3.23858 1 6 1C8.76142 1 11 3.23858 11 6Z" 
          stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div style={{ color: '#dc2626' }}>
        <ToolIcon toolName={toolName} />
      </div>
      <span style={{ fontWeight: 500 }}>{displayName}</span>
      {errorText && <span>· {errorText}</span>}
    </div>
  );
}

function ActionButtons({ 
  message, 
  status, 
  onEdit, 
  onDelete 
}: Pick<PlannerChatMessageProps, 'message' | 'status' | 'onEdit' | 'onDelete'>) {
  return (
    <div 
      data-action-buttons
      style={{ 
        marginTop: '8px',
        display: 'flex',
        gap: '6px',
        opacity: 0,
        transition: 'opacity 0.15s ease'
      }}
    >
      {message.role === 'user' && (
        <button
          onClick={() => onEdit(message.id)}
          disabled={status !== 'ready'}
          style={{
            padding: '4px 8px',
            background: 'transparent',
            border: '1px solid #e5e5e5',
            borderRadius: '6px',
            cursor: status === 'ready' ? 'pointer' : 'not-allowed',
            fontSize: '12px',
            color: '#737373',
            opacity: status === 'ready' ? 1 : 0.4,
            fontWeight: 500,
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            if (status === 'ready') {
              e.currentTarget.style.borderColor = '#d4d4d4';
              e.currentTarget.style.background = '#fafafa';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e5e5e5';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          Edit
        </button>
      )}
      <button
        onClick={() => onDelete(message.id)}
        style={{
          padding: '4px 8px',
          background: 'transparent',
          border: '1px solid #e5e5e5',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          color: '#737373',
          fontWeight: 500,
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#d4d4d4';
          e.currentTarget.style.background = '#fafafa';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#e5e5e5';
          e.currentTarget.style.background = 'transparent';
        }}
      >
        Delete
      </button>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function renderMessagePart(part: MessagePart, index: number): React.ReactNode {
  // Skip step-start markers
  if (part.type === 'step-start') {
    return null;
  }

  // Handle reasoning/thinking state
  if (part.type === 'reasoning') {
    const isInProgress = 'state' in part && part.state !== 'done';
    return isInProgress ? (
      <div key={index} style={{ 
        color: '#a3a3a3', 
        fontStyle: 'italic', 
        marginBottom: '8px',
        fontSize: '14px'
      }}>
        Thinking...
      </div>
    ) : null;
  }

  // Handle text content
  if (part.type === 'text') {
    return (
      <div key={index} style={{ whiteSpace: 'pre-wrap' }}>
        {part.text}
      </div>
    );
  }

  // Handle tool calls
  if (part.type?.startsWith('tool-')) {
    const toolName = part.type.replace('tool-', '');
    
    switch (part.state) {
      case 'input-available':
        return <ToolCallInProgress key={index} toolName={toolName} input={part.input} />;
        
      case 'output-available':
        return <ToolCallSuccess key={index} toolName={toolName} input={part.input} output={part.output} />;
        
      case 'output-error':
        return <ToolCallError key={index} toolName={toolName} errorText={part.errorText} />;
        
      default:
        return null;
    }
  }

  return null;
}

// ============================================================================
// Main Component
// ============================================================================

export function PlannerChatMessage({ message, status, onDelete, onEdit }: PlannerChatMessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <div 
      style={{ 
        marginBottom: '24px',
        display: 'flex',
        gap: '12px',
        position: 'relative',
        width: '100%',
        justifyContent: isUser ? 'flex-end' : 'flex-start'
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
      {/* AI Avatar (left side) */}
      {!isUser && <Avatar role="assistant" />}
      
      {/* Message Content */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '80%'
      }}>
        <div style={{ 
          fontSize: '15px', 
          lineHeight: '1.6', 
          color: '#171717',
          width: '100%',
          ...(isUser ? {
            background: '#f5f5f5',
            padding: '12px 16px',
            borderRadius: '16px',
          } : {})
        }}>
          {message.parts.map((part: MessagePart, index: number) => 
            renderMessagePart(part, index)
          )}
        </div>

        <ActionButtons 
          message={message}
          status={status}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>

      {/* User Avatar (right side) */}
      {isUser && <Avatar role="user" />}
    </div>
  );
}

