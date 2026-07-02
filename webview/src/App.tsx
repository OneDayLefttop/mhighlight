import { useMemo } from 'react';
import { postMessage } from './api';
import { useHighlightStore } from './store';
import type { FileContext, FuzzyConfig, HighlightRule, MatchType, Scope } from './types';

const colors = ['rgba(255, 214, 10, 0.35)', 'rgba(76, 201, 240, 0.35)', 'rgba(255, 112, 150, 0.35)', 'rgba(128, 255, 219, 0.35)'];

interface FileRuleGroup {
  key: string;
  name: string;
  path?: string;
  rules: HighlightRule[];
}

export function App(): JSX.Element {
  const rules = useHighlightStore((state) => state.rules);
  const fuzzyDefaults = useHighlightStore((state) => state.fuzzyDefaults);
  const fileName = useHighlightStore((state) => state.fileName);
  const filePath = useHighlightStore((state) => state.filePath);
  const openFiles = useHighlightStore((state) => state.openFiles);
  const globalRules = rules.filter((rule) => rule.scope === 'global');
  const fileRules = rules.filter((rule) => rule.scope === 'file');

  return (
    <main className="app">
      <header className="toolbar">
        <div>
          <h1>MHighlight</h1>
          <span>{fileName ?? 'No active file'}</span>
        </div>
        <div className="actions">
          <button onClick={() => postMessage({ type: 'importRules' })}>Import</button>
          <button onClick={() => postMessage({ type: 'exportRules' })}>Export</button>
          <button onClick={() => postMessage({ type: 'triggerManual' })}>Manual</button>
          <button onClick={() => postMessage({ type: 'clearHighlights' })}>Clear</button>
        </div>
      </header>

      <RuleSection title="Global rules" scope="global" rules={globalRules} defaults={fuzzyDefaults} openFiles={openFiles} />
      <FileRulesSection
        rules={fileRules}
        defaults={fuzzyDefaults}
        openFiles={openFiles}
        activeFileName={fileName}
        activeFilePath={filePath}
      />
    </main>
  );
}

function RuleSection(props: { title: string; scope: Scope; rules: HighlightRule[]; defaults: FuzzyConfig; openFiles: FileContext[] }): JSX.Element {
  return (
    <section className="section">
      <div className="sectionHeader">
        <h2>{props.title}</h2>
        <button onClick={() => postMessage({ type: 'addRule', rule: createRule(props.scope, props.defaults) })}>Add</button>
      </div>
      <div className="rules">
        {props.rules.map((rule) => (
          <RuleCard key={rule.id} rule={rule} defaults={props.defaults} openFiles={props.openFiles} />
        ))}
        {props.rules.length === 0 && <p className="empty">No rules</p>}
      </div>
    </section>
  );
}

function FileRulesSection(props: { rules: HighlightRule[]; defaults: FuzzyConfig; openFiles: FileContext[]; activeFileName?: string; activeFilePath?: string }): JSX.Element {
  const activeFile = props.activeFilePath
    ? {
      filePath: props.activeFilePath,
      fileName: props.activeFileName ?? basename(props.activeFilePath)
    }
    : undefined;
  const groups = useMemo(() => groupFileRules(props.rules, props.openFiles), [props.rules, props.openFiles]);
  const targetGroups = groups.filter((group) => group.path);

  return (
    <section className="section">
      <div className="sectionHeader">
        <h2>File rules</h2>
        <div className="sectionActions">
          <button
            disabled={!activeFile}
            onClick={() => activeFile && postMessage({ type: 'addRule', rule: createRule('file', props.defaults, activeFile) })}
          >
            Add
          </button>
        </div>
      </div>
      <div className="fileGroups">
        {groups.map((group) => (
          <section className="fileGroup" key={group.key}>
            <div className="fileGroupHeader">
              <h3>{group.name}</h3>
              {group.path && <span title={group.path}>{group.path}</span>}
            </div>
            <div className="rules">
              {group.rules.map((rule) => (
                <RuleCard key={rule.id} rule={rule} defaults={props.defaults} openFiles={props.openFiles} fileGroups={targetGroups} />
              ))}
            </div>
          </section>
        ))}
        {props.rules.length === 0 && <p className="empty">No rules</p>}
      </div>
    </section>
  );
}

function RuleCard(props: { rule: HighlightRule; defaults: FuzzyConfig; openFiles: FileContext[]; fileGroups?: FileRuleGroup[] }): JSX.Element {
  const { rule, defaults, openFiles, fileGroups = [] } = props;
  const update = (patch: Partial<HighlightRule>) => {
    const next = { ...rule, ...patch };
    if (next.matchType === 'fuzzy') {
      next.mode = 'manual';
      next.fuzzyConfig = next.fuzzyConfig ?? defaults;
    }
    postMessage({ type: 'updateRule', rule: next });
  };
  const duplicate = () => {
    postMessage({
      type: 'addRule',
      rule: {
        ...rule,
        id: randomId(),
        name: `${rule.name} copy`
      }
    });
  };

  return (
    <article className="rule">
      <div className="row">
        <input value={rule.name} placeholder="Name" onChange={(event) => update({ name: event.target.value })} />
        <select value={rule.matchType} onChange={(event) => update({ matchType: event.target.value as MatchType })}>
          <option value="string">String</option>
          <option value="wildcard">Wildcard</option>
          <option value="regex">Regex</option>
          <option value="fuzzy">Fuzzy</option>
        </select>
      </div>
      <textarea value={rule.pattern} placeholder="Pattern" rows={2} onChange={(event) => update({ pattern: event.target.value })} />
      {rule.scope === 'file' && (
        <select
          aria-label="Target file"
          value={rule.filePath ?? ''}
          onChange={(event) => {
            const filePath = event.target.value;
            const file = openFiles.find((item) => item.filePath === filePath);
            const group = fileGroups.find((item) => item.path === filePath);
            update({ filePath, fileName: file?.fileName ?? group?.name ?? basename(filePath), filePattern: undefined });
          }}
          disabled={fileGroups.length === 0}
        >
          {!rule.filePath && <option value="">Select file group</option>}
          {fileGroups.map((group) => (
            <option key={group.key} value={group.path}>{group.name}</option>
          ))}
        </select>
      )}
      <div className="row wrap">
        <label><input type="checkbox" checked={rule.enabled} onChange={(event) => postMessage({ type: 'toggleRule', id: rule.id, enabled: event.target.checked })} /> Enabled</label>
        <label><input type="checkbox" checked={rule.caseSensitive} onChange={(event) => update({ caseSensitive: event.target.checked })} /> Case</label>
        <select value={rule.mode} disabled={rule.matchType === 'fuzzy'} onChange={(event) => update({ mode: event.target.value as HighlightRule['mode'] })}>
          <option value="auto">Auto</option>
          <option value="manual">Manual</option>
        </select>
        <input type="color" value={rgbaToHex(rule.backgroundColor)} onChange={(event) => update({ backgroundColor: `${event.target.value}66` })} />
      </div>
      {rule.matchType === 'fuzzy' && <FuzzyEditor rule={rule} defaults={defaults} update={update} />}
      <div className="ruleActions">
        <button onClick={duplicate}>Duplicate</button>
        <button onClick={() => postMessage({ type: 'deleteRule', id: rule.id })}>Delete</button>
      </div>
    </article>
  );
}

function FuzzyEditor(props: { rule: HighlightRule; defaults: FuzzyConfig; update: (patch: Partial<HighlightRule>) => void }): JSX.Element {
  const config = { ...props.defaults, ...props.rule.fuzzyConfig };
  const updateConfig = (patch: Partial<FuzzyConfig>) => props.update({ fuzzyConfig: { ...config, ...patch } });

  return (
    <div className="fuzzy">
      <label>k-mer <input type="number" min={2} max={16} value={config.kmerSize} onChange={(event) => updateConfig({ kmerSize: Number(event.target.value) })} /></label>
      <label>Error <input type="number" min={0} max={1} step={0.01} value={config.maxErrorRate} onChange={(event) => updateConfig({ maxErrorRate: Number(event.target.value) })} /></label>
      <label>Min length <input type="number" min={1} value={config.minMatchLength} onChange={(event) => updateConfig({ minMatchLength: Number(event.target.value) })} /></label>
      <label>x-drop <input type="number" min={1} value={config.xDrop} onChange={(event) => updateConfig({ xDrop: Number(event.target.value) })} /></label>
      <label><input type="checkbox" checked={config.allowIndel} onChange={(event) => updateConfig({ allowIndel: event.target.checked })} /> Indel</label>
    </div>
  );
}

function createRule(scope: Scope, defaults: FuzzyConfig, file?: FileContext): HighlightRule {
  return {
    id: randomId(),
    name: scope === 'global' ? 'Global rule' : `${file?.fileName ?? 'File'} rule`,
    scope,
    filePath: file?.filePath,
    fileName: file?.fileName,
    matchType: 'string',
    pattern: '',
    backgroundColor: colors[Math.floor(Math.random() * colors.length)],
    caseSensitive: false,
    enabled: true,
    mode: 'auto',
    fuzzyConfig: defaults
  };
}

function groupFileRules(rules: HighlightRule[], openFiles: FileContext[]): FileRuleGroup[] {
  const fileNames = new Map(openFiles.map((file) => [file.filePath, file.fileName]));
  const groups = new Map<string, FileRuleGroup>();

  for (const rule of rules) {
    const key = rule.filePath ?? `legacy:${rule.filePattern ?? 'unassigned'}`;
    const name = rule.filePath
      ? rule.fileName ?? fileNames.get(rule.filePath) ?? basename(rule.filePath)
      : 'Unassigned rules';
    const group = groups.get(key) ?? {
      key,
      name,
      path: rule.filePath,
      rules: []
    };
    group.rules.push(rule);
    groups.set(key, group);
  }

  return [...groups.values()];
}

function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function randomId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function rgbaToHex(value: string): string {
  const hex = value.match(/^#([0-9a-f]{6})/i);
  if (hex) {
    return `#${hex[1]}`;
  }
  const parts = value.match(/\d+/g)?.slice(0, 3).map((item) => Number(item).toString(16).padStart(2, '0'));
  return parts && parts.length === 3 ? `#${parts.join('')}` : '#ffd60a';
}
