# mhighlight — VSCode 多模式高亮扩展

## 技术选型（已全部确认）
| 决策点 | 选择 |
|---|---|
| 模糊匹配 | 通用模糊文本 + **kmer-extend 算法**（ungapped，v1） |
| 高亮规则存储 | **内存存储，不持久化**，支持**导入/导出 JSON** |
| 模糊参数(kmerSize/maxErrorRate/minMatchLength/xDrop) | **持久化到 VSCode Settings**（`mhighlight.fuzzyDefaults.*`） |
| 面板 | **React + Vite**，构建到 `media/` |
| 高亮模式 | **auto(实时) + manual(触发)**；**fuzzy 规则默认 manual** |
| **WASM 策略** | **TS 实现 + 可替换 `IFuzzyEngine` 接口**；未来按需替换为 Rust→WASM，上层无感 |
| 目标文件规模 | **< 1MB**（TS + debounce 300ms + 视口限制完全够用） |

## 数据模型 (`src/types.ts`)
```ts
export type MatchType = 'string' | 'wildcard' | 'regex' | 'fuzzy';
export type Scope = 'global' | 'file';
export type HighlightMode = 'auto' | 'manual';

export interface FuzzyConfig {
  kmerSize: number;        // 默认 5
  maxErrorRate: number;    // 默认 0.2
  minMatchLength: number;  // 默认 8
  xDrop: number;           // 默认 10
  allowIndel: boolean;     // 默认 false（v1 仅 mismatch，留接口）
}

export interface HighlightRule {
  id: string; name: string;
  scope: Scope; filePattern?: string;       // scope=file 时为 glob
  matchType: MatchType; pattern: string;
  backgroundColor: string; color?: string;
  caseSensitive: boolean; enabled: boolean;
  mode: HighlightMode;                      // fuzzy 工厂强制 'manual'
  fuzzyConfig?: FuzzyConfig;                // 可覆盖默认
}
```

## 项目结构
```
mhighlight/
├── package.json / tsconfig.json / tsconfig.webview.json
├── vite.config.ts / vitest.config.ts / .vscodeignore / README.md
├── src/
│   ├── extension.ts                 # 激活入口、命令注册、生命周期
│   ├── types.ts
│   ├── matcher/
│   │   ├── types.ts                 # IMatcher / MatchResult / IFuzzyEngine
│   │   ├── stringMatcher.ts / wildcardMatcher.ts / regexMatcher.ts
│   │   ├── tsFuzzyEngine.ts         # kmer-extend 实现（implements IFuzzyEngine）
│   │   ├── fuzzyMatcher.ts          # 依赖 IFuzzyEngine，不关心具体实现
│   │   └── factory.ts               # 按 matchType 产出 matcher；注入 TsFuzzyEngine
│   ├── decoration/
│   │   ├── decorationManager.ts     # color→DecorationType 缓存 + dispose
│   │   └── styleResolver.ts
│   ├── highlighter/
│   │   ├── ruleStore.ts             # 内存 source of truth + 事件
│   │   └── highlightEngine.ts       # auto/manual 分流 + debounce 300ms + 视口限制
│   ├── config/
│   │   ├── io.ts                    # 导入/导出规则 JSON（showSave/OpenDialog）
│   │   └── fuzzyDefaults.ts         # 读写 mhighlight.fuzzyDefaults.*
│   ├── panel/
│   │   ├── highlightPanel.ts        # WebviewPanel 注册与生命周期
│   │   └── messageProtocol.ts       # panel↔ext 双向消息
│   └── commands/index.ts
├── webview/                         # React + zustand + vite，产物→media/
│   ├── index.html / package.json
│   └── src/{main.tsx,App.tsx,api.ts,store.ts,types.ts,components/*}
├── test/matcher/{fuzzyMatcher,wildcardMatcher}.test.ts
└── media/                           # webview.js / webview.css（构建产物）
```

## 匹配引擎
- **String**：朴素扫描，支持 caseSensitive / 整词。
- **Wildcard**：glob（`*`→`.*`、`?`→`.`、`[abc]`）编译成正则。
- **Regex**：`new RegExp` 全局捕获区间。
- **IFuzzyEngine 接口（WASM 替换点）**：
  ```ts
  export interface IFuzzyEngine {
    search(doc: string, pattern: string, cfg: FuzzyConfig): MatchResult[];
  }
  export class TsFuzzyEngine implements IFuzzyEngine { /* v1 */ }
  // 未来: export class WasmFuzzyEngine implements IFuzzyEngine { /* Rust→wasm-pack --target nodejs */ }
  ```
- **TsFuzzyEngine（kmer-extend）**：
  1. 若 `len(pattern) < cfg.minMatchLength` 直接返回。
  2. 建 pattern 的 `Map<kmer, patPos[]>`。
  3. 扫描 doc（步长 1）定位种子。
  4. 种子去重/合并相近种子。
  5. 双向 ungapped 扩展：match +1 / mismatch -penalty，`bestScore - score >= xDrop` 终止。
  6. 错误率 = mismatches/matchedLen ≤ maxErrorRate 且长度 ≥ minMatchLength → 接受。
  7. 合并重叠区间。
  - `allowIndel=true` 留接口（v1 不实现 gapped，标 TODO 后续 banded DP）。

## 装饰与高亮引擎
- **decorationManager**：color→DecorationType 缓存；规则删除/改色时 dispose 旧装饰。
- **ruleStore**：纯内存 Map + 事件（通知 engine 与 panel）；启动为空。
- **highlightEngine**：
  - auto 规则：`onDidChangeActiveTextEditor` / `onDidChangeTextDocument`(debounce 300ms) / 规则变更时，对所有可见 editor 重算并 `setDecorations`。
  - manual 规则：不参与自动；由 `mhighlight.triggerManual` 对当前 editor 一次性应用。
  - 性能：仅算可见 editor；大文档(>200KB)只处理视口行范围。

## 配置层
- **io.ts**：`exportRules()` → `showSaveDialog` 写 JSON（含 fuzzyDefaults）；`importRules()` → `showOpenDialog` 读后合并/替换进 ruleStore。
- **fuzzyDefaults.ts**：通过 `contributes.configuration` 声明 `mhighlight.fuzzyDefaults.{kmerSize,maxErrorRate,minMatchLength,xDrop,allowIndel}`，跨会话持久化；新建 fuzzy 规则时预填。

## Webview 面板（React）
- **构建**：Vite + `@vitejs/plugin-react`，输出 `media/webview.js` + `webview.css`（单 bundle inline）。
- **协议 (messageProtocol.ts)**：
  - panel→ext：`addRule/updateRule/deleteRule/toggleRule/getRules/triggerManual/clearHighlights/importRules/exportRules/saveFuzzyDefaults`
  - ext→panel：`rulesUpdated / fuzzyDefaultsUpdated / activeFileContext`
- **UI**：
  - 顶部工具条：导入 / 导出 / 手动高亮当前文件 / 清除高亮
  - 全局规则区（scope=global）+ 特定文件规则区（scope=file，带 filePattern 输入）
  - 规则卡片：名称 / matchType / pattern / 颜色选择器 / 大小写 / auto·manual 切换 / 启用 / 删除
  - 模糊参数表单（matchType=fuzzy 展开）：kmerSize / maxErrorRate / minMatchLength / xDrop 滑块 +「保存为默认」
  - zustand 持规则副本，ext 推 `rulesUpdated` 时整体替换

## 命令（contributes）
`mhighlight.openPanel` / `mhighlight.triggerManual` / `mhighlight.clear` / `mhighlight.importRules` / `mhighlight.exportRules`

## 实施顺序
1. 脚手架：package.json / tsconfig / vite.config / .vscodeignore / README 占位。
2. types.ts、matcher/types.ts。
3. String/Wildcard/Regex matcher + 单测。
4. TsFuzzyEngine(kmer-extend) + fuzzyMatcher + 重点单测。
5. decorationManager / ruleStore / highlightEngine（auto/manual + debounce + 视口）。
6. config/io.ts、config/fuzzyDefaults.ts。
7. React Webview（骨架→通信层→组件→样式）。
8. highlightPanel + commands/index 接线。
9. F5 联调：自动高亮 / 手动触发 / 模糊匹配 / 导入导出 / 持久化默认值。
10. 打包脚本：`vscode:prepublish` = `vite build && tsc`。

## 测试策略
- vitest 覆盖全部 matcher，重点 fuzzy（容错边界 / 短模式拒绝 / 重叠合并 / 错误率阈值）。
- `@vscode/test-electron` 最小激活测试。
- 示例：pattern `"hello world"`，doc 含 `"helo world"`（1 删除），`maxErrorRate≥0.1` 时命中。

## 关键取舍
- **规则纯内存**（符合需求）+ 导入导出提供可移植性。
- **模糊默认值走标准 configuration 持久化**。
- **fuzzy 规则工厂强制 mode='manual'**，不自动高亮。
- **WASM 现在不做**，但 `IFuzzyEngine` 抽象到位——未来大文件场景出现时，`WasmFuzzyEngine` 同接口替换，工厂一行改动，上层无感（YAGNI 但留扩展点）。
