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

export type PanelToExtensionMessage =
  | { type: 'getRules' }
  | { type: 'addRule'; rule: HighlightRule }
  | { type: 'updateRule'; rule: HighlightRule }
  | { type: 'deleteRule'; id: string }
  | { type: 'toggleRule'; id: string; enabled: boolean }
  | { type: 'triggerManual' }
  | { type: 'clearHighlights' }
  | { type: 'importRules' }
  | { type: 'exportRules' };

export type ExtensionToPanelMessage =
  | { type: 'rulesUpdated'; rules: HighlightRule[] }
  | { type: 'fuzzyDefaultsUpdated'; defaults: FuzzyConfig }
  | { type: 'activeFileContext'; filePath?: string; fileName?: string }
  | { type: 'openFilesContext'; files: FileContext[] };

export interface FileContext {
  filePath: string;
  fileName: string;
}
