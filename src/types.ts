export type MatchType = 'string' | 'wildcard' | 'regex' | 'fuzzy';
export type Scope = 'global' | 'file';
export type HighlightMode = 'auto' | 'manual';

export interface FuzzyConfig {
  kmerSize: number;
  maxErrorRate: number;
  minMatchLength: number;
  xDrop: number;
  allowIndel: boolean;
}

export interface HighlightRule {
  id: string;
  name: string;
  scope: Scope;
  filePath?: string;
  fileName?: string;
  filePattern?: string;
  matchType: MatchType;
  pattern: string;
  backgroundColor: string;
  color?: string;
  caseSensitive: boolean;
  enabled: boolean;
  mode: HighlightMode;
  fuzzyConfig?: FuzzyConfig;
}

export interface ImportExportPayload {
  version: 1;
  rules: HighlightRule[];
  fuzzyDefaults?: FuzzyConfig;
}

export interface FileContext {
  filePath: string;
  fileName: string;
}
