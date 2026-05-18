import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface AppContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  refreshLeads: number;
  triggerRefresh: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [refreshLeads, setRefreshLeads] = useState(0);

  const triggerRefresh = () => setRefreshLeads(prev => prev + 1);

  return (
    <AppContext.Provider value={{ theme, setTheme, refreshLeads, triggerRefresh }}>
      <div className={theme}>
        {children}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
