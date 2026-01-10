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

const TOOL_CONFIG: Record<string, { name: string; verb: string }> = {
  mutate_timeline: { name: 'Timeline', verb: 'Set timeline' },
  mutate_blocks: { name: 'Schedule', verb: 'Updated schedule' },
  web_search: { name: 'Search', verb: 'Searched' },
  web_research: { name: 'Research', verb: 'Researched' },
  ask_followup: { name: 'Questions', verb: 'Asked questions' },
  read_schedule: { name: 'Schedule', verb: 'Read schedule' },
  execute_command: { name: 'Command', verb: 'Ran command' },
};

// ============================================================================
// Todo Parsing & Checkbox Components
// ============================================================================

interface TodoItem {
  text: string;
  checked: boolean;
}

interface ParsedTodo {
  title: string;
  items: TodoItem[];
}

/**
 * Normalizes raw text output to handle various escape sequences and line endings.
 * Handles: \\n (literal), \n, \r\n, \r, and combinations from shell/JSON output.
 */
function normalizeTextOutput(text: string): string {
  return text
    // Handle literal backslash-n sequences (common in JSON-stringified shell output)
    .replace(/\\n/g, '\n')
    // Handle literal backslash-r sequences
    .replace(/\\r/g, '\r')
    // Handle literal backslash-t (tabs)
    .replace(/\\t/g, '\t')
    // Normalize Windows line endings
    .replace(/\r\n/g, '\n')
    // Normalize old Mac line endings
    .replace(/\r/g, '\n');
}

/**
 * Parses a single line to check if it's a todo checkbox item.
 * Handles many variations of markdown checkbox syntax.
 * 
 * Supported formats:
 * - [ ] unchecked item
 * - [x] checked item (case insensitive)
 * - [X] checked item
 * - [✓] checked item
 * - [✔] checked item
 * * [ ] asterisk bullet
 * • [ ] bullet point
 * 1. [ ] numbered list
 */
function parseTodoLine(line: string): TodoItem | null {
  const trimmed = line.trim();
  
  // Skip empty lines
  if (!trimmed) return null;
  
  // Regex patterns for different checkbox formats
  // Checked patterns: [x], [X], [✓], [✔], [√]
  const checkedPattern = /\[\s*[xX✓✔√]\s*\]/;
  
  // Unchecked patterns: [ ], []
  const uncheckedPattern = /\[\s*\]/;
  
  // Combined pattern to match checkbox lines
  // Format: optional_bullet [checkbox] content
  const checkboxLinePattern = /^(?:[-*•◦▪]|\d+\.)?\s*(\[[\s\S]?\])\s*(.+)$/;
  
  const match = trimmed.match(checkboxLinePattern);
  if (!match) return null;
  
  const [, checkbox, content] = match;
  
  // Determine if checked
  const isChecked = checkedPattern.test(checkbox);
  const isUnchecked = uncheckedPattern.test(checkbox);
  
  // Only return if it's a valid checkbox (either checked or unchecked)
  if (!isChecked && !isUnchecked) return null;
  
  return {
    text: content.trim(),
    checked: isChecked,
  };
}

/**
 * Extracts a title from the text content.
 * Looks for markdown headings (#, ##, etc.) or falls back to context clues.
 */
function extractTitle(lines: string[]): string {
  // Look for markdown headings (# Title, ## Title, etc.)
  for (const line of lines) {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      return headingMatch[1].trim();
    }
  }
  
  // Fallback: look for lines that look like titles (no checkbox, short, capitalized)
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and checkbox lines
    if (!trimmed || /\[[\s\S]?\]/.test(trimmed)) continue;
    // Skip lines starting with bullets
    if (/^[-*•◦▪]/.test(trimmed)) continue;
    // If it's a short line (< 80 chars) that doesn't look like a bullet, use it
    if (trimmed.length < 80) {
      return trimmed;
    }
    break;
  }
  
  return '';
}

/**
 * Parses todo/checkbox items from stdout text.
 * Robust parser that handles many format variations from shell output.
 * 
 * @param stdout - Raw stdout text (may contain escaped sequences)
 * @returns Parsed todo data or null if no valid checkboxes found
 */
function parseTodoItems(stdout: string): ParsedTodo | null {
  // Early exit for empty input
  if (!stdout || typeof stdout !== 'string') return null;
  
  // Normalize escape sequences and line endings
  const normalized = normalizeTextOutput(stdout);
  
  // Split into lines, keeping empty lines for context
  const allLines = normalized.split('\n');
  const nonEmptyLines = allLines.filter(line => line.trim());
  
  // Extract title
  const title = extractTitle(nonEmptyLines);
  
  // Parse checkbox items
  const items: TodoItem[] = [];
  for (const line of allLines) {
    const item = parseTodoLine(line);
    if (item) {
      items.push(item);
    }
  }
  
  // Only return if we found valid checkbox items
  return items.length > 0 ? { title, items } : null;
}

function TodoCheckbox({ checked, text }: { checked: boolean; text: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      padding: '3px 0',
    }}>
      <div style={{
        width: '18px',
        height: '18px',
        borderRadius: '4px',
        border: checked ? 'none' : '2px solid #d4d4d4',
        background: checked ? '#2563eb' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: '1px',
      }}>
        {checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span style={{
        color: checked ? '#a3a3a3' : '#171717',
        textDecoration: checked ? 'line-through' : 'none',
        fontSize: '14px',
        lineHeight: '1.5',
      }}>
        {text}
      </span>
    </div>
  );
}

function TodoList({ data }: { data: ParsedTodo }) {
  const checkedCount = data.items.filter(i => i.checked).length;
  const totalCount = data.items.length;
  
  return (
    <div style={{ marginTop: '6px' }}>
      {/* Header with progress */}
      {data.title && (
        <div style={{
          fontSize: '12px',
          color: '#737373',
          marginBottom: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontWeight: 500, color: '#525252' }}>
            {data.title}
          </span>
          <span style={{ color: '#a3a3a3' }}>
            {checkedCount}/{totalCount}
          </span>
        </div>
      )}
      
      {/* Checkbox list */}
      <div style={{ paddingLeft: '2px' }}>
        {data.items.map((item, idx) => (
          <TodoCheckbox key={idx} checked={item.checked} text={item.text} />
        ))}
      </div>
    </div>
  );
}

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

// ============================================================================
// Tool Toggle Component (Notion-style)
// ============================================================================

function ToolToggle({ 
  toolName, 
  input, 
  output, 
  state, 
  errorText 
}: { 
  toolName: string; 
  input?: any; 
  output?: any; 
  state: string;
  errorText?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const config = TOOL_CONFIG[toolName] || { name: toolName.replace(/_/g, ' '), verb: 'Used ' + toolName.replace(/_/g, ' ') };
  
  const isLoading = state === 'input-available';
  const isError = state === 'output-error';
  
  // Check if this is a todo recitation
  const isTodoRecitation = toolName === 'execute_command' && output?.isRecitation && output?.stdout;
  const todoData = isTodoRecitation ? parseTodoItems(output.stdout) : null;

  // If it's a valid todo recitation with items, render as checkboxes
  if (todoData && state === 'output-available') {
    return <TodoList data={todoData} />;
  }
  
  // Generate a brief summary based on tool type and state
  const getSummary = (): string => {
    if (isLoading) return '';
    if (isError) return errorText || 'Failed';
    
    switch (toolName) {
      case 'mutate_timeline':
        if (output?.window) {
          const w = output.window;
          return `${w.start} → ${w.end}`;
        }
        return '';
      case 'mutate_blocks':
        if (output?.message) {
          // Extract just the block title from message like 'Block "Title" added successfully'
          const match = output.message.match(/"([^"]+)"/);
          return match ? match[1] : '';
        }
        return '';
      case 'read_schedule':
        return output?.blocks?.length ? `${output.blocks.length} blocks` : '';
      case 'execute_command':
        return output?.success ? 'Success' : 'Failed';
      case 'web_search':
      case 'web_research':
        return input?.query ? (input.query.length > 30 ? input.query.slice(0, 30) + '...' : input.query) : '';
      case 'ask_followup':
        return output?.questions?.length ? `${output.questions.length} questions` : '';
      default:
        return '';
    }
  };

  const summary = getSummary();
  const hasDetails = (input && Object.keys(input).length > 0) || output;

  return (
    <div style={{ marginTop: '6px' }}>
      {/* Toggle Header */}
      <div
        onClick={() => hasDetails && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 0',
          cursor: hasDetails ? 'pointer' : 'default',
          color: isError ? '#dc2626' : '#525252',
          fontSize: '13px',
          userSelect: 'none',
        }}
      >
        {/* Chevron */}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          style={{
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.12s ease',
            flexShrink: 0,
            opacity: hasDetails ? 1 : 0.3,
          }}
        >
          <path d="M3 1.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        
        {/* Tool name */}
        <span style={{ fontWeight: 500, color: isError ? '#dc2626' : '#171717' }}>
          {config.verb}
        </span>
        
        {/* Loading dot */}
        {isLoading && (
          <span 
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: '#a3a3a3',
              animation: 'toolPulse 1.5s ease-in-out infinite',
            }} 
          />
        )}
        
        {/* Brief summary */}
        {!isLoading && summary && (
          <span style={{ color: isError ? '#dc2626' : '#a3a3a3', fontWeight: 400 }}>
            {summary}
          </span>
        )}
      </div>
      
      {/* Expanded Content */}
      {isOpen && hasDetails && (
        <div style={{
          marginLeft: '16px',
          marginTop: '4px',
          paddingLeft: '10px',
          borderLeft: '1.5px solid #e5e5e5',
          fontSize: '12px',
          color: '#737373',
        }}>
          {/* Input section */}
          {input && Object.keys(input).length > 0 && (
            <div style={{ marginBottom: output ? '8px' : '0' }}>
              <div style={{ 
                fontSize: '10px', 
                fontWeight: 600, 
                color: '#a3a3a3', 
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px' 
              }}>
                Input
              </div>
              <pre style={{
                margin: 0,
                padding: '8px 10px',
                background: '#fafafa',
                borderRadius: '6px',
                overflow: 'auto',
                fontSize: '11px',
                lineHeight: '1.5',
                color: '#525252',
                maxHeight: '150px',
              }}>
                {JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
          
          {/* Output section */}
          {output && (
            <div>
              <div style={{ 
                fontSize: '10px', 
                fontWeight: 600, 
                color: '#a3a3a3', 
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px' 
              }}>
                Output
              </div>
              <pre style={{
                margin: 0,
                padding: '8px 10px',
                background: '#fafafa',
                borderRadius: '6px',
                overflow: 'auto',
                fontSize: '11px',
                lineHeight: '1.5',
                color: '#525252',
                maxHeight: '200px',
              }}>
                {JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Keyframe animation for loading pulse */}
      <style>{`
        @keyframes toolPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
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
        fontSize: '13px'
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

  // Handle tool calls with Notion-style toggle
  if (part.type?.startsWith('tool-')) {
    const toolName = part.type.replace('tool-', '');
    return (
      <ToolToggle
        key={index}
        toolName={toolName}
        input={part.input}
        output={part.output}
        state={part.state || 'unknown'}
        errorText={part.errorText}
      />
    );
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

