# Graph Report - IdeaFactory-v0.1  (2026-10-15)

## Corpus Check
- 29 files · ~36,216 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 247 nodes · 422 edges · 12 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f7726230`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- sketches.ts
- IdeasView.tsx
- devDependencies
- dependencies
- compilerOptions
- package.json
- IdeaFactory
- Quick Idea Generator — Design
- File Structure
- server.ts

## God Nodes (most connected - your core abstractions)
1. `IdeaItem` - 20 edges
2. `compilerOptions` - 16 edges
3. `downloadFile()` - 11 edges
4. `IdeaFactory` - 10 edges
5. `IdeaSketch` - 9 edges
6. `File Structure` - 9 edges
7. `Quick Idea Generator — Design` - 9 edges
8. `scripts` - 8 edges
9. `expandToSpec()` - 8 edges
10. `ProgrammingLanguage` - 8 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `expandToSpec()`  [EXTRACTED]
  src/App.tsx → src/lib/ideasApi.ts
- `ChatbotViewProps` --references--> `IdeaItem`  [EXTRACTED]
  src/components/ChatbotView.tsx → src/types/idea.ts
- `GeneratorViewProps` --references--> `IdeaItem`  [EXTRACTED]
  src/components/GeneratorView.tsx → src/types/idea.ts
- `IdeaDetailModalProps` --references--> `IdeaItem`  [EXTRACTED]
  src/components/IdeaDetailModal.tsx → src/types/idea.ts
- `IdeasViewProps` --references--> `IdeaItem`  [EXTRACTED]
  src/components/IdeasView.tsx → src/types/idea.ts

## Import Cycles
- None detected.

## Communities (12 total, 0 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.10
Nodes (30): App(), ArchitectureView(), ChatbotView(), ChatbotViewProps, DraftBadge(), COMMON_CONSTRAINTS, COMPLEXITIES, DOMAINS (+22 more)

### Community 1 - "sketches.ts"
Cohesion: 0.12
Nodes (31): IdeasOptions, DEMO_SKETCH_POOL, DemoSketchSeed, GOAL_REASONS, buildDemoSketches(), cleanAvoidTitles(), cleanTags(), CONCRETE_DOMAINS (+23 more)

### Community 2 - "IdeasView.tsx"
Cohesion: 0.11
Nodes (22): ChipRowProps, DEFAULT_IDEAS_OPTIONS, IdeasView(), MODEL_OPTIONS, SketchBatch, CardAction, SketchCard(), SketchCardProps (+14 more)

### Community 3 - "devDependencies"
Cohesion: 0.10
Nodes (21): autoprefixer, esbuild, devDependencies, autoprefixer, esbuild, tailwindcss, tsx, @types/express (+13 more)

### Community 4 - "dependencies"
Cohesion: 0.10
Nodes (21): dotenv, express, @google/genai, lucide-react, motion, dependencies, dotenv, express (+13 more)

### Community 5 - "compilerOptions"
Cohesion: 0.10
Nodes (20): DOM, DOM.Iterable, ES2022, vite/client, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators (+12 more)

### Community 6 - "package.json"
Cohesion: 0.12
Nodes (16): allowScripts, esbuild@0.28.2, @google/genai@2.28.0, protobufjs@7.6.6, name, private, scripts, build (+8 more)

### Community 7 - "IdeaFactory"
Cohesion: 0.12
Nodes (16): API overview, Contributing, Current implementation, Development commands, Enable live Gemini responses, Environment variables, Features, Getting started (+8 more)

### Community 8 - "Quick Idea Generator — Design"
Cohesion: 0.14
Nodes (13): Approach, Client, Data model (`src/types/idea.ts`), Drafts in existing views, Intent, Out of scope, Pure logic module (`src/lib/sketches.ts`), Quick Idea Generator — Design (+5 more)

### Community 9 - "File Structure"
Cohesion: 0.15
Nodes (12): File Structure, Global Constraints, Quick Idea Generator Implementation Plan, Review Focus, Task 1: Vitest setup, types, and request normalization, Task 2: Sketch parsing, draft conversion, expand prompt, Task 3: Demo sketch pool and `buildDemoSketches`, Task 4: `POST /api/generate-ideas` endpoint (+4 more)

### Community 10 - "server.ts"
Cohesion: 0.17
Nodes (9): app, __dirname, __filename, GOAL_GUIDANCE, repository, SKETCH_ANGLES, SEED_IDEAS, CONCRETE_LANGUAGES (+1 more)

## Knowledge Gaps
- **107 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+102 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `IdeaItem` connect `App.tsx` to `sketches.ts`, `server.ts`, `IdeasView.tsx`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _107 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09634146341463415 - nodes in this community are weakly interconnected._
- **Should `sketches.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11522048364153627 - nodes in this community are weakly interconnected._
- **Should `IdeasView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11264367816091954 - nodes in this community are weakly interconnected._