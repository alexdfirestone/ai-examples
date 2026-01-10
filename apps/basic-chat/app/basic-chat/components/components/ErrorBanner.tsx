'use client';

interface ErrorBannerProps {
  onReload: () => void;
}

export function ErrorBanner({ onReload }: ErrorBannerProps) {
  return (
    <div style={{ 
      marginBottom: '20px', 
      padding: '12px 16px', 
      background: '#fff',
      border: '1px solid #e5e5e5',
      borderRadius: '8px'
    }}>
      <div style={{ fontWeight: '500', marginBottom: '8px', color: '#000' }}>An error occurred</div>
      <div style={{ fontSize: '14px', marginBottom: '12px', color: '#666' }}>Something went wrong. Please try again.</div>
      <button 
        onClick={onReload}
        style={{ 
          padding: '8px 16px', 
          background: '#000', 
          color: '#fff', 
          border: 'none', 
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        Retry
      </button>
    </div>
  );
}

