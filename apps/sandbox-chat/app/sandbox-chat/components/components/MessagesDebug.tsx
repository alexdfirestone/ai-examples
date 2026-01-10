'use client';

import { useState, useMemo } from 'react';

interface MessagesDebugProps {
  messages: any[];
  status?: string;
}

interface JsonNodeProps {
  data: any;
  name?: string;
  depth?: number;
}

function JsonNode({ data, name, depth = 0 }: JsonNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 1);
  const indent = depth * 12;

  if (data === null || data === undefined) {
    return (
      <div style={{ paddingLeft: `${indent}px`, fontFamily: 'monospace', fontSize: '12px', lineHeight: '20px' }}>
        {name && <span style={{ color: '#8b949e' }}>{name}: </span>}
        <span style={{ color: '#79c0ff' }}>{String(data)}</span>
      </div>
    );
  }

  const dataType = typeof data;

  if (dataType === 'string') {
    const truncated = data.length > 100 ? `${data.substring(0, 100)}...` : data;
    return (
      <div style={{ paddingLeft: `${indent}px`, fontFamily: 'monospace', fontSize: '12px', lineHeight: '20px' }}>
        {name && <span style={{ color: '#8b949e' }}>{name}: </span>}
        <span style={{ color: '#a5d6ff' }}>"{truncated}"</span>
      </div>
    );
  }

  if (dataType === 'number' || dataType === 'boolean') {
    return (
      <div style={{ paddingLeft: `${indent}px`, fontFamily: 'monospace', fontSize: '12px', lineHeight: '20px' }}>
        {name && <span style={{ color: '#8b949e' }}>{name}: </span>}
        <span style={{ color: '#79c0ff' }}>{String(data)}</span>
      </div>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div style={{ paddingLeft: `${indent}px`, fontFamily: 'monospace', fontSize: '12px', lineHeight: '20px' }}>
          {name && <span style={{ color: '#8b949e' }}>{name}: </span>}
          <span style={{ color: '#6e7681' }}>[]</span>
        </div>
      );
    }

    return (
      <div>
        <div 
          style={{ 
            paddingLeft: `${indent}px`, 
            fontFamily: 'monospace', 
            fontSize: '12px',
            lineHeight: '20px',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span style={{ color: '#6e7681', marginRight: '4px', display: 'inline-block', width: '10px' }}>
            {isExpanded ? '▼' : '▶'}
          </span>
          {name && <span style={{ color: '#8b949e' }}>{name}: </span>}
          <span style={{ color: '#6e7681' }}>[{data.length}]</span>
        </div>
        {isExpanded && data.map((item, index) => (
          <JsonNode key={index} data={item} name={String(index)} depth={depth + 1} />
        ))}
      </div>
    );
  }

  if (dataType === 'object') {
    const keys = Object.keys(data);
    
    if (keys.length === 0) {
      return (
        <div style={{ paddingLeft: `${indent}px`, fontFamily: 'monospace', fontSize: '12px', lineHeight: '20px' }}>
          {name && <span style={{ color: '#8b949e' }}>{name}: </span>}
          <span style={{ color: '#6e7681' }}>{'{}'}</span>
        </div>
      );
    }

    return (
      <div>
        <div 
          style={{ 
            paddingLeft: `${indent}px`, 
            fontFamily: 'monospace', 
            fontSize: '12px',
            lineHeight: '20px',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span style={{ color: '#6e7681', marginRight: '4px', display: 'inline-block', width: '10px' }}>
            {isExpanded ? '▼' : '▶'}
          </span>
          {name && <span style={{ color: '#8b949e' }}>{name}: </span>}
          <span style={{ color: '#6e7681' }}>{'{'}{keys.length}{'}'}</span>
        </div>
        {isExpanded && keys.map((key) => (
          <JsonNode key={key} data={data[key]} name={key} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return null;
}

export function MessagesDebug({ messages, status }: MessagesDebugProps) {
  const [view, setView] = useState<'tree' | 'raw'>('tree');
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    return {
      total: messages.length,
      user: messages.filter(m => m.role === 'user').length,
      assistant: messages.filter(m => m.role === 'assistant').length,
      parts: messages.reduce((sum, m) => sum + (m.parts?.length || 0), 0)
    };
  }, [messages]);

  const filteredMessages = useMemo(() => {
    if (!searchTerm) return messages;
    const term = searchTerm.toLowerCase();
    return messages.filter((msg, idx) => 
      String(idx).includes(term) ||
      msg.role?.toLowerCase().includes(term) ||
      msg.id?.toLowerCase().includes(term) ||
      JSON.stringify(msg).toLowerCase().includes(term)
    );
  }, [messages, searchTerm]);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(messages, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      flex: 1, 
      minHeight: 0, 
      fontSize: '13px',
      background: '#0d1117',
      color: '#e6edf3',
    }}>
      {/* Stats Bar */}
      <div style={{ 
        padding: '12px 16px',
        borderBottom: '1px solid #30363d',
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        alignItems: 'center',
        background: '#161b22'
      }}>
        <div><span style={{ color: '#8b949e' }}>Total:</span> <strong>{stats.total}</strong></div>
        <div><span style={{ color: '#8b949e' }}>User:</span> <strong>{stats.user}</strong></div>
        <div><span style={{ color: '#8b949e' }}>AI:</span> <strong>{stats.assistant}</strong></div>
        <div><span style={{ color: '#8b949e' }}>Parts:</span> <strong>{stats.parts}</strong></div>
        {status && <div><span style={{ color: '#8b949e' }}>Status:</span> <code style={{ 
          background: '#21262d', 
          padding: '2px 6px', 
          borderRadius: '3px',
          fontSize: '11px',
          border: '1px solid #30363d',
          color: '#7ee787'
        }}>{status}</code></div>}
      </div>

      {/* Controls */}
      <div style={{ 
        padding: '12px 16px',
        borderBottom: '1px solid #30363d',
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
      }}>
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: '6px 10px',
            border: '1px solid #30363d',
            borderRadius: '4px',
            fontSize: '12px',
            outline: 'none',
            background: '#0d1117',
            color: '#e6edf3',
          }}
        />
        <button
          onClick={() => setView(view === 'tree' ? 'raw' : 'tree')}
          style={{
            padding: '6px 12px',
            background: '#21262d',
            border: '1px solid #30363d',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            color: '#e6edf3'
          }}
        >
          {view === 'tree' ? 'Raw' : 'Tree'}
        </button>
        <button
          onClick={handleCopy}
          style={{
            padding: '6px 12px',
            background: copied ? '#238636' : '#21262d',
            color: '#fff',
            border: '1px solid #30363d',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'background 0.2s',
            minWidth: '60px'
          }}
        >
          {copied ? '✓' : 'Copy'}
        </button>
      </div>

      {/* Content */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        padding: '16px',
        minHeight: 0
      }}>
        {filteredMessages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#8b949e', padding: '40px 0' }}>
            No messages found
          </div>
        ) : view === 'tree' ? (
          <div style={{ 
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '6px',
            padding: '12px'
          }}>
            <JsonNode data={filteredMessages} />
          </div>
        ) : (
          <pre style={{ 
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '6px',
            padding: '12px',
            margin: 0,
            fontSize: '11px',
            lineHeight: '1.5',
            overflow: 'auto',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            color: '#e6edf3'
          }}>
            {JSON.stringify(filteredMessages, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

