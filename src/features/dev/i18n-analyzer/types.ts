export interface SyncIssue {
  namespace: string;
  key: string;
  missingIn: 'en' | 'ru';
}

export interface NamespaceStats {
  name: string;
  ruKeys: number;
  enKeys: number;
  syncIssues: number;
}

export interface AnalysisReport {
  syncIssues: SyncIssue[];
  stats: {
    totalNamespaces: number;
    totalKeysRu: number;
    totalKeysEn: number;
    namespaceStats: NamespaceStats[];
  };
}

export interface FilterState {
  namespace: string | null;
  missingIn: 'all' | 'en' | 'ru';
  searchQuery: string;
}
