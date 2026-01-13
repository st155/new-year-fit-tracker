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

export interface JsonValidationError {
  namespace: string;
  language: 'en' | 'ru';
  line: number;
  column: number;
  message: string;
  preview: string; // 3 lines of context around the error
  rawError: string;
}

export interface AnalysisReport {
  syncIssues: SyncIssue[];
  languageIssues: LanguageIssue[];
  stats: {
    totalNamespaces: number;
    totalKeysRu: number;
    totalKeysEn: number;
    namespaceStats: NamespaceStats[];
  };
  jsonErrors: JsonValidationError[];
  brokenNamespaces: string[]; // namespaces that failed to parse
}

export interface FilterState {
  namespace: string | null;
  missingIn: 'all' | 'en' | 'ru';
  searchQuery: string;
}

export interface LanguageIssue {
  namespace: string;
  key: string;
  value: string;
  language: 'en' | 'ru';
  issue: 'cyrillic_in_en' | 'latin_in_ru_value';
}
