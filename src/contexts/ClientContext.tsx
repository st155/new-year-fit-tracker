import { createContext, useContext, useState, ReactNode } from 'react';

export interface ClientContextData {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  goals_count?: number;
  progress_percentage?: number;
  last_measurement_date?: string;
}

export interface ClientNavigationSource {
  type: 'overview' | 'challenges' | 'ai-hub' | 'goals' | 'clients';
  challengeId?: string;
  challengeName?: string;
  conversationId?: string;
}

interface ClientContextType {
  selectedClient: ClientContextData | null;
  navigationSource: ClientNavigationSource | null;
  setSelectedClient: (client: ClientContextData | null, source?: ClientNavigationSource) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientContextProvider = ({ children }: { children: ReactNode }) => {
  const [selectedClient, setSelectedClientState] = useState<ClientContextData | null>(null);
  const [navigationSource, setNavigationSource] = useState<ClientNavigationSource | null>(null);

  const setSelectedClient = (
    client: ClientContextData | null, 
    source?: ClientNavigationSource
  ) => {
    setSelectedClientState(client);
    setNavigationSource(source || null);
  };

  return (
    <ClientContext.Provider value={{ selectedClient, navigationSource, setSelectedClient }}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClientContext = () => {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClientContext must be used within ClientContextProvider');
  }
  return context;
};
