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
        {name && <span style={{ color: '#666' }}>{name}: </span>}
        <span style={{ color: '#0086d4' }}>{String(data)}</span>
      </div>
    );
  }

  const dataType = typeof data;

  if (dataType === 'string') {
    const truncated = data.length > 100 ? `${data.substring(0, 100)}...` : data;
    return (
      <div style={{ paddingLeft: `${indent}px`, fontFamily: 'monospace', fontSize: '12px', lineHeight: '20px' }}>
        {name && <span style={{ color: '#666' }}>{name}: </span>}
        <span style={{ color: '#c41a16' }}>"{truncated}"</span>
      </div>
    );
  }

  if (dataType === 'number' || dataType === 'boolean') {
    return (
      <div style={{ paddingLeft: `${indent}px`, fontFamily: 'monospace', fontSize: '12px', lineHeight: '20px' }}>
        {name && <span style={{ color: '#666' }}>{name}: </span>}
        <span style={{ color: '#0086d4' }}>{String(data)}</span>
      </div>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div style={{ paddingLeft: `${indent}px`, fontFamily: 'monospace', fontSize: '12px', lineHeight: '20px' }}>
          {name && <span style={{ color: '#666' }}>{name}: </span>}
          <span style={{ color: '#999' }}>[]</span>
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
          <span style={{ color: '#999', marginRight: '4px', display: 'inline-block', width: '10px' }}>
            {isExpanded ? '▼' : '▶'}
          </span>
          {name && <span style={{ color: '#666' }}>{name}: </span>}
          <span style={{ color: '#999' }}>[{data.length}]</span>
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
          {name && <span style={{ color: '#666' }}>{name}: </span>}
          <span style={{ color: '#999' }}>{'{}'}</span>
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
          <span style={{ color: '#999', marginRight: '4px', display: 'inline-block', width: '10px' }}>
            {isExpanded ? '▼' : '▶'}
          </span>
          {name && <span style={{ color: '#666' }}>{name}: </span>}
          <span style={{ color: '#999' }}>{'{'}{keys.length}{'}'}</span>
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontSize: '13px' }}>
      {/* Stats Bar */}
      <div style={{ 
        padding: '12px 16px',
        borderBottom: '1px solid #e5e5e5',
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        alignItems: 'center',
        background: '#fafafa'
      }}>
        <div><span style={{ color: '#999' }}>Total:</span> <strong>{stats.total}</strong></div>
        <div><span style={{ color: '#999' }}>User:</span> <strong>{stats.user}</strong></div>
        <div><span style={{ color: '#999' }}>AI:</span> <strong>{stats.assistant}</strong></div>
        <div><span style={{ color: '#999' }}>Parts:</span> <strong>{stats.parts}</strong></div>
        {status && <div><span style={{ color: '#999' }}>Status:</span> <code style={{ 
          background: '#fff', 
          padding: '2px 6px', 
          borderRadius: '3px',
          fontSize: '11px',
          border: '1px solid #e5e5e5'
        }}>{status}</code></div>}
      </div>

      {/* Controls */}
      <div style={{ 
        padding: '12px 16px',
        borderBottom: '1px solid #e5e5e5',
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
            border: '1px solid #d0d0d0',
            borderRadius: '4px',
            fontSize: '12px',
            outline: 'none'
          }}
        />
        <button
          onClick={() => setView(view === 'tree' ? 'raw' : 'tree')}
          style={{
            padding: '6px 12px',
            background: '#fff',
            border: '1px solid #d0d0d0',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            color: '#666'
          }}
        >
          {view === 'tree' ? 'Raw' : 'Tree'}
        </button>
        <button
          onClick={handleCopy}
          style={{
            padding: '6px 12px',
            background: copied ? '#00aa44' : '#000',
            color: '#fff',
            border: 'none',
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
        padding: '16px'
      }}>
        {filteredMessages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
            No messages found
          </div>
        ) : view === 'tree' ? (
          <div style={{ 
            background: '#fff',
            border: '1px solid #e5e5e5',
            borderRadius: '6px',
            padding: '12px'
          }}>
            <JsonNode data={filteredMessages} />
          </div>
        ) : (
          <pre style={{ 
            background: '#fff',
            border: '1px solid #e5e5e5',
            borderRadius: '6px',
            padding: '12px',
            margin: 0,
            fontSize: '11px',
            lineHeight: '1.5',
            overflow: 'auto',
            fontFamily: 'monospace'
          }}>
            {JSON.stringify(filteredMessages, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

