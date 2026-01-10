'use client';

export function LoadingIndicator() {
  return (
    <div style={{ 
      marginBottom: '32px',
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-start',
      paddingRight: '20%'
    }}>
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
      <div style={{ paddingTop: '6px' }}>
        <div style={{ 
          display: 'inline-block',
          animation: 'pulse 1.5s ease-in-out infinite',
          color: '#999'
        }}>
          ...
        </div>
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}

