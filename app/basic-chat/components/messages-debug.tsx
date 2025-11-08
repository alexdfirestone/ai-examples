'use client';

import { useState } from 'react';

interface MessagesDebugProps {
  messages: unknown;
}

export function MessagesDebug({ messages }: MessagesDebugProps) {
  const [showJson, setShowJson] = useState(false);

  return (
    <div style={{ border: '1px solid #000', borderRadius: '5px', padding: '10px' }}>
      <button 
        type="button" 
        onClick={() => setShowJson(!showJson)}
        style={{ 
          padding: '8px 16px', 
          background: '#000', 
          color: '#fff', 
          border: 'none', 
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {showJson ? '▼' : '▶'} Raw Messages JSON
      </button>
      {showJson && (
        <pre style={{ 
          background: '#f5f5f5', 
          padding: '15px', 
          overflow: 'auto', 
          marginTop: '10px',
          borderRadius: '4px',
          maxHeight: '400px',
          border: '1px solid #ddd'
        }}>
          {JSON.stringify(messages, null, 2)}
        </pre>
      )}
    </div>
  );
}

