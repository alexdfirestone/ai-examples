"use client"

import * as React from "react"

interface AccordionItemProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

interface AccordionTriggerProps {
  children: React.ReactNode;
}

interface AccordionContentProps {
  children: React.ReactNode;
}

const AccordionContext = React.createContext<{
  isOpen: boolean;
  toggle: () => void;
}>({
  isOpen: false,
  toggle: () => {},
});

export function AccordionItem({ children, defaultOpen = false }: AccordionItemProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  
  const toggle = React.useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return (
    <AccordionContext.Provider value={{ isOpen, toggle }}>
      <div style={{ borderBottom: '1px solid #e5e5e5', background: '#fff' }}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

export function AccordionTrigger({ children }: AccordionTriggerProps) {
  const { isOpen, toggle } = React.useContext(AccordionContext);
  
  return (
    <button
      onClick={toggle}
      style={{
        width: '100%',
        padding: '12px 16px',
        fontWeight: '600',
        fontSize: '13px',
        color: '#333',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        textAlign: 'left'
      }}
    >
      <span>{children}</span>
      <span style={{ 
        transition: 'transform 0.2s',
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
      }}>
        ▼
      </span>
    </button>
  );
}

export function AccordionContent({ children }: AccordionContentProps) {
  const { isOpen } = React.useContext(AccordionContext);
  
  if (!isOpen) return null;
  
  return (
    <div>
      {children}
    </div>
  );
}

