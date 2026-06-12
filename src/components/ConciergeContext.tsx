import React, { createContext, useContext, useState } from 'react';

interface ConciergeContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  openWithPrompt: (prompt: string) => void;
}

const ConciergeContext = createContext<ConciergeContextType | undefined>(undefined);

export const ConciergeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);

  const openWithPrompt = (prompt: string) => {
    setIsOpen(true);
    // We'll use this to trigger a message in the DigitalConcierge component
    window.dispatchEvent(new CustomEvent('concierge-prompt', { detail: prompt }));
  };

  return (
    <ConciergeContext.Provider value={{ isOpen, setIsOpen, openWithPrompt }}>
      {children}
    </ConciergeContext.Provider>
  );
};

export const useConcierge = () => {
  const context = useContext(ConciergeContext);
  if (!context) throw new Error('useConcierge must be used within ConciergeProvider');
  return context;
};
