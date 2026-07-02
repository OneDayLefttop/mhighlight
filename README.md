# MHighlight

MHighlight is a VS Code extension for highlighting configured patterns in the current workspace. Rules live in memory by default and can be imported or exported as JSON.

## Features

- Global rules and file-scoped rules.
- Multiple match types: string, wildcard, regex, and fuzzy.
- Auto mode for live highlighting.
- Manual mode for expensive or intentional searches.
- Fuzzy rules are forced to manual mode by default.
- Fuzzy defaults are stored in VS Code Settings under `mhighlight.fuzzyDefaults.*`.

## Fuzzy Matching

The fuzzy engine is a TypeScript `kmer-extend` implementation behind an `IFuzzyEngine` interface. It supports mismatch-tolerant matching, optional insertion/deletion handling with continuous highlight ranges, and merges overlapping ranges.

Current v1 behavior:

- Builds a k-mer index for the pattern.
- Scans the document for seed hits.
- Extends seeds in both directions with x-drop termination.
- Accepts matches when `mismatches / length <= maxErrorRate`.
- Does not implement insertion/deletion alignment yet.

## Commands

- `MHighlight: Open Highlight Panel`
- `MHighlight: Trigger Manual Highlight`
- `MHighlight: Clear Highlights`
- `MHighlight: Import Rules`
- `MHighlight: Export Rules`

## Development

```bash
npm install
npm run compile
npm test
npm run build:webview
```

Press F5 in VS Code to launch an Extension Development Host, then run `MHighlight: Open Highlight Panel`.

## Rule JSON Shape

```json
{
  "version": 1,
  "rules": [
    {
      "id": "example",
      "name": "TODOs",
      "scope": "global",
      "matchType": "regex",
      "pattern": "TODO|FIXME",
      "backgroundColor": "rgba(255, 214, 10, 0.35)",
      "caseSensitive": false,
      "enabled": true,
      "mode": "auto"
    }
  ],
  "fuzzyDefaults": {
    "kmerSize": 5,
    "maxErrorRate": 0.2,
    "minMatchLength": 8,
    "xDrop": 10,
    "allowIndel": true
  }
}
```
