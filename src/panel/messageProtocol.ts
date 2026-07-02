import type { FileContext, FuzzyConfig, HighlightRule } from '../types';

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
