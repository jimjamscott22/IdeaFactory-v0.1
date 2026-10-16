# Quick Idea Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an **Ideas** tab. In it, the user picks language, level, domain, goal, and batch size by clicking chips, presses Generate, and gets several short project ideas. Each idea can be saved as a Repository draft or expanded into a full spec.

**Architecture:** A new `POST /api/generate-ideas` endpoint returns N lightweight `IdeaSketch` objects from a single structured Gemini call. With no API key, it returns them from a local demo pool. All validation, parsing, demo selection, and draft conversion live in a pure module, `src/lib/sketches.ts`, which is unit-tested with Vitest. Expanding an idea reuses the existing `/api/generate-idea` endpoint. Saving reuses `POST /api/ideas`, with `isDraft: true` on the `IdeaItem`.

**Tech Stack:** React 19, TypeScript, Tailwind 4, lucide-react, Express, `@google/genai`, Vitest 5 (new dev dependency).

**Spec:** `docs/superpowers/specs/2026-10-15-quick-idea-generator-design.md`

## Global Constraints

- Use `npm` for this Node project. `uv` is not involved.
- Vitest is the only new dependency, and it is a **dev** dependency. Add no runtime dependencies.
- The default sketch model is `gemini-3.1-flash-lite`. The default expand model when expanding from the Repository modal is `gemini-3.8-flash`.
- The only valid batch sizes are **3, 5, and 8**.
- The Ideas defaults are **Any Language, Intermediate, Any Domain, Portfolio, 5**.
- The exact goal labels are **`Learning`, `Portfolio`, `Interview Prep`, `Real-World Tool`**.
- Sketches are **never** added to the server's in-memory repository by `/api/generate-ideas`.
- Existing Generator, Refiner, Chat, and Architecture behavior stays unchanged.
- The Ideas tab is first in the navbar and is the default `activeTab`.
- Every task must leave `npm run lint` (`tsc --noEmit`) passing.
- UI styling follows the existing dark slate/emerald Tailwind classes used in `GeneratorView.tsx`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **The model returns language or domain values in the wrong case or outside the allowed lists**, for example `"rust"` or `"Web Apps"`. Each value should map case-insensitively to an allowed value or fall back to a sensible default, never crash or show junk. Task 2 tests this.
2. **The model returns malformed JSON, a bare array, an object without `ideas`, or zero usable items.** Parsing should return `[]`, and the server should respond with a 502 and a readable error, not a 500 stack trace. Task 2 tests the parsing, and Task 4 checks the server path.
3. **The request body is hostile or malformed**, for example `null`, `count: "abc"`, 1000-character titles, or `avoidTitles` that is not an array. The server should fall back to defaults and clamp values. Task 1 tests this.
4. **Repeated demo-mode re-rolls with a narrow domain exhaust the matching pool.** The generator should still return exactly `count` ideas. Task 3 tests this.
5. **The user changes a chip or double-clicks Generate while a request is in flight.** The stale response must not overwrite newer state, and the spinner must clear. The `AbortController` logic in Task 6 handles this, and Task 8 covers it with a manual step.

---

## File Structure

| File | Status | Responsibility |
| --- | --- | --- |
| `package.json` | Modify | Add `vitest` dev dependency and `test` script |
| `src/types/idea.ts` | Modify | `ProjectGoal`, `DomainChoice`, `IdeaCount`, `IdeaSketch`, `GenerateIdeasRequest`; `IdeaItem.isDraft`/`goal` |
| `src/lib/sketches.ts` | Create | Option lists, defaults, request normalization, sketch parsing, demo selection, draft conversion, expand prompt |
| `src/lib/sketches.test.ts` | Create | Unit tests for `sketches.ts` |
| `src/data/demoSketches.ts` | Create | 30 hand-written demo sketch seeds + goal reasons |
| `src/lib/ideasApi.ts` | Create | Client fetch helpers: `requestIdeas`, `saveDraft`, `expandToSpec` |
| `src/lib/ideasApi.test.ts` | Create | Unit tests for `ideasApi.ts` with stubbed `fetch` |
| `server.ts` | Modify | `POST /api/generate-ideas` |
| `src/components/SketchCard.tsx` | Create | One idea card with Save / Expand and per-card error |
| `src/components/IdeasView.tsx` | Create | Chip rows, Generate button, loading/empty/error states, card grid |
| `src/components/DraftBadge.tsx` | Create | Small "Draft" label reused in Repository and modal |
| `src/components/Navbar.tsx` | Modify | Add `ideas` tab first |
| `src/App.tsx` | Modify | Ideas state, `ideas` default tab, save/expand handlers, modal expand |
| `src/components/RepositoryView.tsx` | Modify | Draft badge + architecture fallback text |
| `src/components/IdeaDetailModal.tsx` | Modify | Draft panel with "Expand to full spec" |
| `README.md` | Modify | Document Ideas tab, endpoint, `npm test` |

---

### Task 1: Vitest setup, types, and request normalization

**Files:**
- Modify: `package.json`
- Modify: `src/types/idea.ts`
- Create: `src/lib/sketches.ts`
- Test: `src/lib/sketches.test.ts`

**Interfaces:**
- Consumes: existing `ProgrammingLanguage`, `ComplexityLevel`, `DomainCategory`, `IdeaItem` from `src/types/idea.ts`.
- Produces:
  - Types: `ProjectGoal`, `DomainChoice`, `IdeaCount`, `IdeaSketch`, `GenerateIdeasRequest`; `IdeaItem.isDraft?: boolean`, `IdeaItem.goal?: ProjectGoal`.
  - `LANGUAGE_OPTIONS: ProgrammingLanguage[]` (starts with `'Any Language'`), `CONCRETE_LANGUAGES`, `COMPLEXITY_OPTIONS`, `CONCRETE_DOMAINS: DomainCategory[]`, `DOMAIN_OPTIONS: DomainChoice[]` (starts with `'Any Domain'`), `GOAL_OPTIONS`, `COUNT_OPTIONS: IdeaCount[]`.
  - `DEFAULT_IDEAS_REQUEST: GenerateIdeasRequest`, `DEFAULT_SKETCH_MODEL = 'gemini-3.1-flash-lite'`, `DEFAULT_EXPAND_MODEL = 'gemini-3.8-flash'`.
  - `matchOption<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T`
  - `normalizeGenerateIdeasRequest(body: unknown): GenerateIdeasRequest`

- [ ] **Step 1: Install Vitest and add the test script**

Run:
```bash
npm install --save-dev vitest@^5.0.5
```
Then edit the `"scripts"` block in `package.json` and add a `test` entry after `lint`:
```json
    "lint": "tsc --noEmit",
    "test": "vitest run"
```
Vitest 5 lists `vite ^8.0.0` as a peer dependency, which matches this repo's Vite 8. If npm reports a peer conflict, stop and report it. Do not use `--force`.

- [ ] **Step 2: Add the new types to `src/types/idea.ts`**

Insert the following after the `ProgrammingLanguage` type, which ends with `| 'Any Language';`:

```ts
export type ProjectGoal = 'Learning' | 'Portfolio' | 'Interview Prep' | 'Real-World Tool';

export type DomainChoice = DomainCategory | 'Any Domain';

export type IdeaCount = 3 | 5 | 8;

export interface IdeaSketch {
  id: string;
  title: string;
  pitch: string;
  whyItFits: string;
  estimatedHours: string;
  tags: string[];
  language: ProgrammingLanguage;
  domain: DomainCategory;
  complexity: ComplexityLevel;
  goal: ProjectGoal;
}

export interface GenerateIdeasRequest {
  language: ProgrammingLanguage;
  complexity: ComplexityLevel;
  domain: DomainChoice;
  goal: ProjectGoal;
  count: IdeaCount;
  avoidTitles: string[];
  model?: string;
}
```

In `interface IdeaItem`, add these lines after `isBookmarked?: boolean;`:
```ts
  isDraft?: boolean;
  goal?: ProjectGoal;
```

- [ ] **Step 3: Write the failing tests**

Create `src/lib/sketches.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_IDEAS_REQUEST, normalizeGenerateIdeasRequest } from './sketches';

describe('normalizeGenerateIdeasRequest', () => {
  it('passes valid input through unchanged', () => {
    const input = {
      language: 'Go',
      complexity: 'Advanced',
      domain: 'Database Engines',
      goal: 'Learning',
      count: 8,
      avoidTitles: ['Old Idea'],
      model: 'gemini-3.5-flash',
    };
    expect(normalizeGenerateIdeasRequest(input)).toEqual(input);
  });

  it('falls back to defaults for unknown values', () => {
    expect(
      normalizeGenerateIdeasRequest({
        language: 'COBOL',
        complexity: 'Godlike',
        domain: 'Baking',
        goal: 'Fame',
      })
    ).toEqual(DEFAULT_IDEAS_REQUEST);
  });

  it.each([null, undefined, 'text', 42, []])('returns defaults for a non-object body (%s)', (body) => {
    expect(normalizeGenerateIdeasRequest(body)).toEqual(DEFAULT_IDEAS_REQUEST);
  });

  it('matches option values case-insensitively', () => {
    const result = normalizeGenerateIdeasRequest({
      language: 'rust',
      domain: ' database engines ',
      goal: 'interview prep',
      complexity: 'staff / distributed',
    });
    expect(result.language).toBe('Rust');
    expect(result.domain).toBe('Database Engines');
    expect(result.goal).toBe('Interview Prep');
    expect(result.complexity).toBe('Staff / Distributed');
  });

  it.each([
    [1, 3],
    [3, 3],
    [4, 3],
    [5, 5],
    [6, 5],
    [7, 8],
    [100, 8],
    ['8', 8],
    ['abc', 5],
    [undefined, 5],
    [null, 5],
    ['', 5],
  ])('snaps count %s to %s', (count, expected) => {
    expect(normalizeGenerateIdeasRequest({ count }).count).toBe(expected);
  });

  it('cleans avoidTitles: trims, drops non-strings and blanks, truncates to 120, caps at 10', () => {
    const titles = [' Padded ', 42, '', '   ', 'x'.repeat(200), ...Array.from({ length: 12 }, (_, i) => `T${i}`)];
    const result = normalizeGenerateIdeasRequest({ avoidTitles: titles });
    expect(result.avoidTitles).toHaveLength(10);
    expect(result.avoidTitles[0]).toBe('Padded');
    expect(result.avoidTitles[1]).toHaveLength(120);
    expect(result.avoidTitles[2]).toBe('T0');
  });

  it('ignores avoidTitles that is not an array', () => {
    expect(normalizeGenerateIdeasRequest({ avoidTitles: 'Old Idea' }).avoidTitles).toEqual([]);
  });

  it('drops a blank model', () => {
    expect(normalizeGenerateIdeasRequest({ model: '  ' }).model).toBeUndefined();
  });
});
```

- [ ] **Step 4: Run the tests and confirm they fail**

Run: `npm test`
Expected: FAIL with an error that `./sketches` cannot be resolved.

- [ ] **Step 5: Write the implementation**

Create `src/lib/sketches.ts`:

```ts
import type {
  ComplexityLevel,
  DomainCategory,
  DomainChoice,
  GenerateIdeasRequest,
  IdeaCount,
  ProgrammingLanguage,
  ProjectGoal,
} from '../types/idea';

export const LANGUAGE_OPTIONS: ProgrammingLanguage[] = [
  'Any Language',
  'Rust',
  'Go',
  'Python',
  'TypeScript',
  'C++',
  'Zig',
  'Elixir',
  'Kotlin',
  'Swift',
  'Haskell',
];

export const CONCRETE_LANGUAGES: ProgrammingLanguage[] = LANGUAGE_OPTIONS.filter(
  (language) => language !== 'Any Language'
);

export const COMPLEXITY_OPTIONS: ComplexityLevel[] = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Staff / Distributed',
];

export const CONCRETE_DOMAINS: DomainCategory[] = [
  'CLI & DevTools',
  'Distributed Systems',
  'Compilers & Interpreters',
  'Networking Protocols',
  'AI Agents & MCP',
  'Database Engines',
  'Security & Cryptography',
  'Real-Time & Streaming',
  'Systems & OS / eBPF',
  'Full-Stack Architecture',
];

export const DOMAIN_OPTIONS: DomainChoice[] = ['Any Domain', ...CONCRETE_DOMAINS];

export const GOAL_OPTIONS: ProjectGoal[] = ['Learning', 'Portfolio', 'Interview Prep', 'Real-World Tool'];

export const COUNT_OPTIONS: IdeaCount[] = [3, 5, 8];

export const DEFAULT_IDEAS_REQUEST: GenerateIdeasRequest = {
  language: 'Any Language',
  complexity: 'Intermediate',
  domain: 'Any Domain',
  goal: 'Portfolio',
  count: 5,
  avoidTitles: [],
};

export const DEFAULT_SKETCH_MODEL = 'gemini-3.1-flash-lite';
export const DEFAULT_EXPAND_MODEL = 'gemini-3.8-flash';

const MAX_AVOID_TITLES = 10;
const MAX_AVOID_TITLE_LENGTH = 120;

// Case-insensitive lookup against an allowed list; anything else becomes the fallback.
export function matchOption<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value !== 'string') return fallback;
  const needle = value.trim().toLowerCase();
  return allowed.find((option) => option.toLowerCase() === needle) ?? fallback;
}

// Snaps any numeric-ish input to the nearest allowed batch size (ties go to the smaller size).
function snapCount(value: unknown): IdeaCount {
  if (value === undefined || value === null || value === '') return DEFAULT_IDEAS_REQUEST.count;
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_IDEAS_REQUEST.count;
  return COUNT_OPTIONS.reduce((best, option) =>
    Math.abs(option - n) < Math.abs(best - n) ? option : best
  );
}

function cleanAvoidTitles(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((title): title is string => typeof title === 'string' && title.trim() !== '')
    .map((title) => title.trim().slice(0, MAX_AVOID_TITLE_LENGTH))
    .slice(0, MAX_AVOID_TITLES);
}

export function normalizeGenerateIdeasRequest(body: unknown): GenerateIdeasRequest {
  const input =
    body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const model = typeof input.model === 'string' && input.model.trim() ? input.model.trim() : undefined;

  return {
    language: matchOption(input.language, LANGUAGE_OPTIONS, DEFAULT_IDEAS_REQUEST.language),
    complexity: matchOption(input.complexity, COMPLEXITY_OPTIONS, DEFAULT_IDEAS_REQUEST.complexity),
    domain: matchOption(input.domain, DOMAIN_OPTIONS, DEFAULT_IDEAS_REQUEST.domain),
    goal: matchOption(input.goal, GOAL_OPTIONS, DEFAULT_IDEAS_REQUEST.goal),
    count: snapCount(input.count),
    avoidTitles: cleanAvoidTitles(input.avoidTitles),
    model,
  };
}
```

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS, with every test in `normalizeGenerateIdeasRequest` green.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/types/idea.ts src/lib/sketches.ts src/lib/sketches.test.ts
git commit -m "feat: add idea sketch types and request normalization

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Sketch parsing, draft conversion, expand prompt

**Files:**
- Modify: `src/lib/sketches.ts`
- Test: `src/lib/sketches.test.ts`

**Interfaces:**
- Consumes: everything from Task 1.
- Produces:
  - `parseSketches(raw: unknown, req: GenerateIdeasRequest, now?: number): IdeaSketch[]`. It accepts `{ ideas: [...] }` or a bare array. Sketch ids are `sketch-<now>-<index>`.
  - `sketchToDraftIdea(sketch: IdeaSketch, now?: Date): IdeaItem`. The draft id is `draft-<sketch.id>`.
  - `type ExpandSource = Pick<IdeaSketch, 'title' | 'pitch' | 'language' | 'domain' | 'complexity'> & { goal?: ProjectGoal }`
  - `buildExpandPrompt(source: Pick<ExpandSource, 'title' | 'pitch' | 'goal'>): string`

- [ ] **Step 1: Write the failing tests**

Replace the import lines at the top of `src/lib/sketches.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import type { GenerateIdeasRequest, IdeaSketch } from '../types/idea';
import {
  DEFAULT_IDEAS_REQUEST,
  buildExpandPrompt,
  normalizeGenerateIdeasRequest,
  parseSketches,
  sketchToDraftIdea,
} from './sketches';
```

Append to the end of `src/lib/sketches.test.ts`:

```ts
const baseReq: GenerateIdeasRequest = { ...DEFAULT_IDEAS_REQUEST, count: 5 };

const rawItem = (overrides: Record<string, unknown> = {}) => ({
  title: 'Idea A',
  pitch: 'Pitch A',
  whyItFits: 'Fits the goal',
  estimatedHours: '10-20 hours',
  tags: ['a', 'b'],
  language: 'Go',
  domain: 'Database Engines',
  ...overrides,
});

describe('parseSketches', () => {
  it('accepts an { ideas } object and a bare array', () => {
    expect(parseSketches({ ideas: [rawItem()] }, baseReq)).toHaveLength(1);
    expect(parseSketches([rawItem()], baseReq)).toHaveLength(1);
  });

  it.each([undefined, null, 'text', 42, {}, { ideas: 'nope' }])('returns [] for unusable payload %s', (raw) => {
    expect(parseSketches(raw, baseReq)).toEqual([]);
  });

  it('drops non-objects and items without a title or pitch', () => {
    const result = parseSketches(
      [rawItem({ title: '' }), rawItem({ pitch: '   ' }), null, 'str', rawItem({ title: 'Keep' })],
      baseReq
    );
    expect(result.map((s) => s.title)).toEqual(['Keep']);
  });

  it('dedupes titles case-insensitively and skips avoidTitles', () => {
    const req = { ...baseReq, avoidTitles: ['Old One'] };
    const result = parseSketches(
      [rawItem({ title: 'Same' }), rawItem({ title: 'same' }), rawItem({ title: 'old one' }), rawItem({ title: 'New' })],
      req
    );
    expect(result.map((s) => s.title)).toEqual(['Same', 'New']);
  });

  it('caps the result at count', () => {
    const items = Array.from({ length: 6 }, (_, i) => rawItem({ title: `Idea ${i}` }));
    expect(parseSketches(items, { ...baseReq, count: 3 })).toHaveLength(3);
  });

  it('maps model language/domain case-insensitively when the request is Any, with fallbacks', () => {
    const result = parseSketches(
      [
        rawItem({ title: 'One', language: 'rust', domain: 'networking protocols' }),
        rawItem({ title: 'Two', language: 'COBOL', domain: 'Baking' }),
      ],
      baseReq
    );
    expect(result.map((s) => [s.language, s.domain])).toEqual([
      ['Rust', 'Networking Protocols'],
      ['TypeScript', 'Full-Stack Architecture'],
    ]);
  });

  it('uses a concrete requested language/domain over the model output', () => {
    const req = { ...baseReq, language: 'Zig' as const, domain: 'Compilers & Interpreters' as const };
    const [sketch] = parseSketches([rawItem({ language: 'Go', domain: 'Database Engines' })], req);
    expect(sketch.language).toBe('Zig');
    expect(sketch.domain).toBe('Compilers & Interpreters');
  });

  it('fills defaults, cleans tags, and stamps request fields and ids', () => {
    const req = { ...baseReq, complexity: 'Advanced' as const, goal: 'Learning' as const };
    const [sketch] = parseSketches(
      [rawItem({ whyItFits: undefined, estimatedHours: 7, tags: ['x', 3, ' y ', '', 'a', 'b', 'c', 'd'] })],
      req,
      1000
    );
    expect(sketch).toMatchObject({
      id: 'sketch-1000-0',
      whyItFits: '',
      estimatedHours: '20-30 hours',
      tags: ['x', 'y', 'a', 'b', 'c'],
      complexity: 'Advanced',
      goal: 'Learning',
    });
  });
});

const sampleSketch: IdeaSketch = {
  id: 'sketch-1-0',
  title: 'Tiny KV',
  pitch: 'A tiny key-value store.',
  whyItFits: 'Teaches storage basics.',
  estimatedHours: '10-20 hours',
  tags: ['storage'],
  language: 'Go',
  domain: 'Database Engines',
  complexity: 'Advanced',
  goal: 'Learning',
};

describe('sketchToDraftIdea', () => {
  it('builds a complete draft IdeaItem', () => {
    const draft = sketchToDraftIdea(sampleSketch, new Date('2026-10-15T12:00:00Z'));
    expect(draft).toEqual({
      id: 'draft-sketch-1-0',
      title: 'Tiny KV',
      tagline: 'A tiny key-value store.',
      language: 'Go',
      domain: 'Database Engines',
      complexity: 'Advanced',
      estimatedHours: '10-20 hours',
      problemStatement: 'A tiny key-value store.',
      coreArchitecture: '',
      techStack: { language: 'Go', protocols: [], libraries: [] },
      architectureFlow: [],
      keyChallenges: [],
      mvpPhases: [],
      learningOutcomes: [],
      interviewTalkingPoints: [],
      tags: ['storage'],
      isDraft: true,
      isBookmarked: false,
      goal: 'Learning',
      createdAt: '2026-10-15',
    });
  });
});

describe('buildExpandPrompt', () => {
  it('includes title, pitch, and goal', () => {
    const prompt = buildExpandPrompt(sampleSketch);
    expect(prompt).toContain('"Tiny KV"');
    expect(prompt).toContain('A tiny key-value store.');
    expect(prompt).toContain('Learning');
  });

  it('omits the goal line when there is no goal', () => {
    const prompt = buildExpandPrompt({ title: 'Tiny KV', pitch: 'A tiny key-value store.' });
    expect(prompt).not.toContain('goal');
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test`
Expected: FAIL. The cause is that `parseSketches`, `sketchToDraftIdea`, and `buildExpandPrompt` are not exported, so the tests see them as undefined and report "is not a function".

- [ ] **Step 3: Write the implementation**

In `src/lib/sketches.ts`, extend the type import so that it contains these names:

```ts
import type {
  ComplexityLevel,
  DomainCategory,
  DomainChoice,
  GenerateIdeasRequest,
  IdeaCount,
  IdeaItem,
  IdeaSketch,
  ProgrammingLanguage,
  ProjectGoal,
} from '../types/idea';
```

Append to the end of `src/lib/sketches.ts`:

```ts
const FALLBACK_LANGUAGE: ProgrammingLanguage = 'TypeScript';
const FALLBACK_DOMAIN: DomainCategory = 'Full-Stack Architecture';
const FALLBACK_HOURS = '20-30 hours';
const MAX_TAGS = 5;

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

function resolveLanguage(value: unknown, requested: ProgrammingLanguage): ProgrammingLanguage {
  if (requested !== 'Any Language') return requested;
  return matchOption(value, CONCRETE_LANGUAGES, FALLBACK_LANGUAGE);
}

function resolveDomain(value: unknown, requested: DomainChoice): DomainCategory {
  if (requested !== 'Any Domain') return requested;
  return matchOption(value, CONCRETE_DOMAINS, FALLBACK_DOMAIN);
}

function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(text).filter(Boolean).slice(0, MAX_TAGS);
}

// Turns untrusted model output into at most `req.count` valid, unique sketches.
export function parseSketches(raw: unknown, req: GenerateIdeasRequest, now = Date.now()): IdeaSketch[] {
  const items: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { ideas?: unknown }).ideas)
      ? (raw as { ideas: unknown[] }).ideas
      : [];

  const seenTitles = new Set(req.avoidTitles.map((title) => title.toLowerCase()));
  const sketches: IdeaSketch[] = [];

  for (const item of items) {
    if (sketches.length >= req.count) break;
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;

    const title = text(record.title);
    const pitch = text(record.pitch);
    if (!title || !pitch) continue;

    const titleKey = title.toLowerCase();
    if (seenTitles.has(titleKey)) continue;
    seenTitles.add(titleKey);

    sketches.push({
      id: `sketch-${now}-${sketches.length}`,
      title,
      pitch,
      whyItFits: text(record.whyItFits),
      estimatedHours: text(record.estimatedHours) || FALLBACK_HOURS,
      tags: cleanTags(record.tags),
      language: resolveLanguage(record.language, req.language),
      domain: resolveDomain(record.domain, req.domain),
      complexity: req.complexity,
      goal: req.goal,
    });
  }

  return sketches;
}

// A saved sketch becomes a sparse IdeaItem flagged as a draft until it is expanded.
export function sketchToDraftIdea(sketch: IdeaSketch, now = new Date()): IdeaItem {
  return {
    id: `draft-${sketch.id}`,
    title: sketch.title,
    tagline: sketch.pitch,
    language: sketch.language,
    domain: sketch.domain,
    complexity: sketch.complexity,
    estimatedHours: sketch.estimatedHours,
    problemStatement: sketch.pitch,
    coreArchitecture: '',
    techStack: { language: sketch.language, protocols: [], libraries: [] },
    architectureFlow: [],
    keyChallenges: [],
    mvpPhases: [],
    learningOutcomes: [],
    interviewTalkingPoints: [],
    tags: sketch.tags,
    isDraft: true,
    isBookmarked: false,
    goal: sketch.goal,
    createdAt: now.toISOString().split('T')[0],
  };
}

export type ExpandSource = Pick<IdeaSketch, 'title' | 'pitch' | 'language' | 'domain' | 'complexity'> & {
  goal?: ProjectGoal;
};

export function buildExpandPrompt(source: Pick<ExpandSource, 'title' | 'pitch' | 'goal'>): string {
  return [
    `Expand this project idea into a full specification: "${source.title}".`,
    `Pitch: ${source.pitch}`,
    source.goal ? `The builder's primary goal is: ${source.goal}.` : '',
    'Keep the same core concept and project name.',
  ]
    .filter(Boolean)
    .join('\n');
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS, with every test green.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sketches.ts src/lib/sketches.test.ts
git commit -m "feat: parse idea sketches and convert them to drafts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Demo sketch pool and `buildDemoSketches`

**Files:**
- Create: `src/data/demoSketches.ts`
- Modify: `src/lib/sketches.ts`
- Test: `src/lib/sketches.test.ts`

**Interfaces:**
- Consumes: `GenerateIdeasRequest`, `IdeaSketch`, `CONCRETE_DOMAINS` from Tasks 1–2.
- Produces:
  - `interface DemoSketchSeed { title; pitch; estimatedHours; tags: string[]; domain: DomainCategory; languages: ProgrammingLanguage[] }`
  - `DEMO_SKETCH_POOL: DemoSketchSeed[]`, which has 30 entries, 3 for each domain
  - `GOAL_REASONS: Record<ProjectGoal, string>`
  - `buildDemoSketches(req: GenerateIdeasRequest, rng?: () => number, now?: number): IdeaSketch[]`. It always returns exactly `req.count` sketches.

- [ ] **Step 1: Create the demo pool**

Create `src/data/demoSketches.ts`:

```ts
import type { DomainCategory, ProgrammingLanguage, ProjectGoal } from '../types/idea';

export interface DemoSketchSeed {
  title: string;
  pitch: string;
  estimatedHours: string;
  tags: string[];
  domain: DomainCategory;
  languages: ProgrammingLanguage[];
}

export const GOAL_REASONS: Record<ProjectGoal, string> = {
  Learning: 'Teaches core concepts you can build up one piece at a time.',
  Portfolio: 'Produces a visible, demo-able result that stands out on a portfolio.',
  'Interview Prep': 'Touches classic design trade-offs that come up in technical interviews.',
  'Real-World Tool': 'Solves a real problem you could use day to day once it is built.',
};

// Hand-written ideas used when no Gemini key is configured. Keep three or more per domain.
export const DEMO_SKETCH_POOL: DemoSketchSeed[] = [
  // CLI & DevTools
  { title: 'Git Time Machine', pitch: "A TUI that replays a repository's history as an animated timeline of file churn, authorship, and hotspots.", estimatedHours: '15-25 hours', tags: ['TUI', 'Git', 'Visualization'], domain: 'CLI & DevTools', languages: ['Rust', 'Go', 'Python'] },
  { title: 'Shell History Miner', pitch: 'Mines your shell history to suggest aliases, detect repeated command chains, and generate scripts for them.', estimatedHours: '10-20 hours', tags: ['CLI', 'Automation', 'Text Mining'], domain: 'CLI & DevTools', languages: ['Python', 'Go', 'Rust'] },
  { title: 'Dotfile Drift Detector', pitch: 'Compares dotfiles across machines over SSH and shows a three-way diff with one-key sync.', estimatedHours: '15-20 hours', tags: ['SSH', 'Diffing', 'Config'], domain: 'CLI & DevTools', languages: ['Go', 'Rust', 'Python'] },
  // Distributed Systems
  { title: 'Gossip-Powered Feature Flags', pitch: 'A feature-flag service whose nodes converge through a SWIM-style gossip protocol instead of a central database.', estimatedHours: '30-45 hours', tags: ['Gossip', 'SWIM', 'Eventual Consistency'], domain: 'Distributed Systems', languages: ['Go', 'Rust', 'Elixir'] },
  { title: 'Raft Playground', pitch: 'A Raft implementation with a web visualizer that lets you partition nodes and watch leader elections live.', estimatedHours: '35-50 hours', tags: ['Raft', 'Consensus', 'Visualization'], domain: 'Distributed Systems', languages: ['Go', 'Rust', 'TypeScript'] },
  { title: 'Distributed Rate Limiter', pitch: 'A sliding-window rate limiter shared across instances with CRDT counters and no single point of failure.', estimatedHours: '25-35 hours', tags: ['CRDT', 'Rate Limiting', 'Resilience'], domain: 'Distributed Systems', languages: ['Go', 'Rust', 'Kotlin'] },
  // Compilers & Interpreters
  { title: 'Regex-to-WASM Compiler', pitch: "Compiles regular expressions into DFAs and emits WebAssembly matchers you can benchmark against the browser's engine.", estimatedHours: '25-40 hours', tags: ['Automata', 'WebAssembly', 'Codegen'], domain: 'Compilers & Interpreters', languages: ['Rust', 'Zig', 'TypeScript'] },
  { title: 'Spreadsheet Formula Engine', pitch: 'A parser and evaluator for spreadsheet formulas with dependency tracking and incremental recalculation.', estimatedHours: '20-30 hours', tags: ['Parsing', 'Dependency Graph', 'Evaluation'], domain: 'Compilers & Interpreters', languages: ['TypeScript', 'Rust', 'Haskell'] },
  { title: 'Tiny Lisp with a Debugger', pitch: 'A small Lisp interpreter with a step debugger, call-stack viewer, and time-travel through evaluation.', estimatedHours: '20-35 hours', tags: ['Interpreter', 'Lisp', 'Debugging'], domain: 'Compilers & Interpreters', languages: ['Haskell', 'Python', 'Rust'] },
  // Networking Protocols
  { title: 'DNS Resolver from Scratch', pitch: 'A recursive DNS resolver that walks from the root servers, caches answers, and explains each hop.', estimatedHours: '20-30 hours', tags: ['DNS', 'UDP', 'Caching'], domain: 'Networking Protocols', languages: ['Go', 'Rust', 'Zig'] },
  { title: 'LAN Chat over Multicast', pitch: 'Serverless chat for a local network using UDP multicast discovery and end-to-end encrypted rooms.', estimatedHours: '15-25 hours', tags: ['Multicast', 'UDP', 'P2P'], domain: 'Networking Protocols', languages: ['Go', 'Rust', 'Elixir'] },
  { title: 'HTTP/1.1 Server Kata', pitch: 'A from-scratch HTTP/1.1 server with keep-alive, chunked encoding, and a conformance test suite.', estimatedHours: '15-25 hours', tags: ['HTTP', 'TCP', 'Testing'], domain: 'Networking Protocols', languages: ['C++', 'Zig', 'Go'] },
  // AI Agents & MCP
  { title: 'Repo Q&A MCP Server', pitch: 'An MCP server that indexes a codebase and exposes tools for symbol lookup, call graphs, and test discovery.', estimatedHours: '20-30 hours', tags: ['MCP', 'Code Search', 'Tooling'], domain: 'AI Agents & MCP', languages: ['Python', 'TypeScript', 'Go'] },
  { title: 'Agent Eval Harness', pitch: 'A harness that replays recorded tasks against an AI agent and scores tool usage, cost, and correctness.', estimatedHours: '25-35 hours', tags: ['Evaluation', 'Agents', 'Benchmarking'], domain: 'AI Agents & MCP', languages: ['Python', 'TypeScript'] },
  { title: 'Local RAG Notebook', pitch: 'Turns a folder of notes into a local retrieval-augmented assistant with citations back to the source lines.', estimatedHours: '20-30 hours', tags: ['RAG', 'Embeddings', 'Local-First'], domain: 'AI Agents & MCP', languages: ['Python', 'Rust', 'TypeScript'] },
  // Database Engines
  { title: 'Append-Only KV Store', pitch: 'A Bitcask-style key-value store with an in-memory index, crash recovery, and background compaction.', estimatedHours: '25-35 hours', tags: ['Storage', 'WAL', 'Compaction'], domain: 'Database Engines', languages: ['Rust', 'Go', 'C++', 'Zig'] },
  { title: 'SQL Query Visualizer', pitch: 'Parses SQL, builds a logical plan, and animates how rows flow through joins and filters.', estimatedHours: '20-30 hours', tags: ['SQL', 'Query Planning', 'Visualization'], domain: 'Database Engines', languages: ['TypeScript', 'Python', 'Kotlin'] },
  { title: 'Time-Series Mini Engine', pitch: 'A columnar time-series store with Gorilla compression and downsampling queries.', estimatedHours: '30-45 hours', tags: ['Time Series', 'Compression', 'Columnar'], domain: 'Database Engines', languages: ['Rust', 'Go', 'C++'] },
  // Security & Cryptography
  { title: 'Password Vault CLI', pitch: 'A local-first password vault using Argon2 key derivation, authenticated encryption, and Git-based sync.', estimatedHours: '20-30 hours', tags: ['Cryptography', 'Argon2', 'CLI'], domain: 'Security & Cryptography', languages: ['Rust', 'Go', 'Python'] },
  { title: 'Supply-Chain Auditor', pitch: 'Scans lockfiles, checks packages against advisories, and flags suspicious install scripts.', estimatedHours: '15-25 hours', tags: ['Supply Chain', 'SBOM', 'Static Analysis'], domain: 'Security & Cryptography', languages: ['Go', 'Python', 'TypeScript'] },
  { title: 'TOTP Authenticator Service', pitch: 'An RFC 6238 TOTP service with QR-code enrollment and rate-limited verification.', estimatedHours: '10-20 hours', tags: ['TOTP', '2FA', 'RFC 6238'], domain: 'Security & Cryptography', languages: ['Go', 'Kotlin', 'TypeScript', 'Python'] },
  // Real-Time & Streaming
  { title: 'Collaborative Whiteboard', pitch: 'A multiplayer whiteboard that syncs strokes with CRDTs and keeps working offline.', estimatedHours: '25-40 hours', tags: ['CRDT', 'WebSockets', 'Offline'], domain: 'Real-Time & Streaming', languages: ['TypeScript', 'Elixir', 'Rust'] },
  { title: 'Live Log Tail Dashboard', pitch: 'Streams logs from many services, parses them on the fly, and highlights anomalies in a browser dashboard.', estimatedHours: '20-30 hours', tags: ['Streaming', 'Log Parsing', 'WebSockets'], domain: 'Real-Time & Streaming', languages: ['Go', 'Elixir', 'TypeScript'] },
  { title: 'Market Data Replay Engine', pitch: 'Replays historical market data as a real-time stream with backpressure and configurable speed.', estimatedHours: '20-30 hours', tags: ['Backpressure', 'Event Streams', 'Replay'], domain: 'Real-Time & Streaming', languages: ['Rust', 'Kotlin', 'Go'] },
  // Systems & OS / eBPF
  { title: 'Process Tree Profiler', pitch: 'Uses eBPF to trace process spawns and file opens, then renders a live tree of what each command touched.', estimatedHours: '30-45 hours', tags: ['eBPF', 'Tracing', 'Linux'], domain: 'Systems & OS / eBPF', languages: ['Rust', 'Go', 'C++'] },
  { title: 'Green Thread Scheduler', pitch: 'A green-thread library with a work-stealing scheduler and benchmarks against OS threads.', estimatedHours: '25-40 hours', tags: ['Scheduling', 'Concurrency', 'Benchmarks'], domain: 'Systems & OS / eBPF', languages: ['C++', 'Zig', 'Rust'] },
  { title: 'Container from Scratch', pitch: 'A minimal container runtime built from namespaces, cgroups, and an overlay filesystem.', estimatedHours: '30-40 hours', tags: ['Namespaces', 'cgroups', 'Linux'], domain: 'Systems & OS / eBPF', languages: ['Go', 'Rust', 'C++'] },
  // Full-Stack Architecture
  { title: 'Habit Pattern Coach', pitch: 'A habit tracker that detects streak-breaking patterns and suggests realistic schedule changes.', estimatedHours: '15-25 hours', tags: ['Full-Stack', 'Analytics', 'UX'], domain: 'Full-Stack Architecture', languages: ['TypeScript', 'Kotlin', 'Swift', 'Python'] },
  { title: 'Self-Hosted Link Shortener', pitch: 'A link shortener with click analytics, QR codes, and an admin dashboard, deployable with one command.', estimatedHours: '10-20 hours', tags: ['Web', 'Analytics', 'Docker'], domain: 'Full-Stack Architecture', languages: ['Go', 'TypeScript', 'Python', 'Elixir'] },
  { title: 'Open Source Issue Matchmaker', pitch: 'Matches developers with beginner-friendly issues using their GitHub activity and preferred languages.', estimatedHours: '20-30 hours', tags: ['GitHub API', 'Recommendations', 'Full-Stack'], domain: 'Full-Stack Architecture', languages: ['TypeScript', 'Python', 'Kotlin'] },
];
```

- [ ] **Step 2: Write the failing tests**

In `src/lib/sketches.test.ts`, add `buildDemoSketches` and `CONCRETE_DOMAINS` to the `./sketches` import, and add this import line:

```ts
import { DEMO_SKETCH_POOL } from '../data/demoSketches';
```

Append to the end of the file:

```ts
// Deterministic RNG (mulberry32) so shuffles are reproducible in tests.
function seededRng(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('DEMO_SKETCH_POOL', () => {
  it('has unique titles, valid languages, and at least three ideas per domain', () => {
    const titles = DEMO_SKETCH_POOL.map((seed) => seed.title.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
    for (const seed of DEMO_SKETCH_POOL) {
      expect(seed.languages.length).toBeGreaterThan(0);
      expect(seed.languages).not.toContain('Any Language');
    }
    for (const domain of CONCRETE_DOMAINS) {
      expect(DEMO_SKETCH_POOL.filter((seed) => seed.domain === domain).length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('buildDemoSketches', () => {
  it('returns count unique sketches stamped with the request', () => {
    const req = { ...baseReq, count: 5 as const, goal: 'Learning' as const, complexity: 'Beginner' as const };
    const result = buildDemoSketches(req, seededRng(1), 42);
    expect(result).toHaveLength(5);
    expect(new Set(result.map((s) => s.title)).size).toBe(5);
    for (const [index, sketch] of result.entries()) {
      expect(sketch.id).toBe(`sketch-42-${index}`);
      expect(sketch.goal).toBe('Learning');
      expect(sketch.complexity).toBe('Beginner');
      expect(sketch.whyItFits).not.toBe('');
      expect(sketch.language).not.toBe('Any Language');
    }
  });

  it('prefers the requested domain', () => {
    const result = buildDemoSketches({ ...baseReq, domain: 'Database Engines', count: 3 }, seededRng(2));
    expect(result.every((s) => s.domain === 'Database Engines')).toBe(true);
  });

  it('applies a concrete requested language to every sketch', () => {
    const result = buildDemoSketches({ ...baseReq, language: 'Go', count: 8 }, seededRng(3));
    expect(result.every((s) => s.language === 'Go')).toBe(true);
  });

  it('returns a different batch when the previous titles are avoided', () => {
    const rng = seededRng(4);
    const first = buildDemoSketches({ ...baseReq, count: 8 }, rng);
    const second = buildDemoSketches({ ...baseReq, count: 8, avoidTitles: first.map((s) => s.title) }, rng);
    const firstTitles = new Set(first.map((s) => s.title));
    expect(second.some((s) => firstTitles.has(s.title))).toBe(false);
  });

  it('fills from the rest of the pool when the domain filter runs out', () => {
    const dbTitles = DEMO_SKETCH_POOL.filter((seed) => seed.domain === 'Database Engines').map((seed) => seed.title);
    const result = buildDemoSketches(
      { ...baseReq, domain: 'Database Engines', count: 8, avoidTitles: dbTitles },
      seededRng(5)
    );
    expect(result).toHaveLength(8);
    expect(result.some((s) => dbTitles.includes(s.title))).toBe(false);
  });

  it('still returns count sketches when every title is avoided', () => {
    const result = buildDemoSketches(
      { ...baseReq, count: 8, avoidTitles: DEMO_SKETCH_POOL.map((seed) => seed.title) },
      seededRng(6)
    );
    expect(result).toHaveLength(8);
  });
});
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `npm test`
Expected: FAIL, because `buildDemoSketches` is not exported.

- [ ] **Step 4: Write the implementation**

At the top of `src/lib/sketches.ts`, under the type import, add:

```ts
import { DEMO_SKETCH_POOL, GOAL_REASONS, type DemoSketchSeed } from '../data/demoSketches';
```

Append to the end of `src/lib/sketches.ts`:

```ts
function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Demo-mode batches: matching ideas first, then the rest of the pool, never fewer than `count`.
export function buildDemoSketches(
  req: GenerateIdeasRequest,
  rng: () => number = Math.random,
  now = Date.now()
): IdeaSketch[] {
  const avoided = new Set(req.avoidTitles.map((title) => title.toLowerCase()));
  const fresh = DEMO_SKETCH_POOL.filter((seed) => !avoided.has(seed.title.toLowerCase()));
  const matches = (seed: DemoSketchSeed) =>
    (req.domain === 'Any Domain' || seed.domain === req.domain) &&
    (req.language === 'Any Language' || seed.languages.includes(req.language));

  let chosen = [
    ...shuffle(fresh.filter(matches), rng),
    ...shuffle(fresh.filter((seed) => !matches(seed)), rng),
  ].slice(0, req.count);

  if (chosen.length < req.count) {
    const leftovers = shuffle(DEMO_SKETCH_POOL.filter((seed) => !chosen.includes(seed)), rng);
    chosen = [...chosen, ...leftovers].slice(0, req.count);
  }

  return chosen.map((seed, index) => ({
    id: `sketch-${now}-${index}`,
    title: seed.title,
    pitch: seed.pitch,
    whyItFits: GOAL_REASONS[req.goal],
    estimatedHours: seed.estimatedHours,
    tags: seed.tags,
    language:
      req.language !== 'Any Language'
        ? req.language
        : seed.languages[Math.floor(rng() * seed.languages.length)],
    domain: seed.domain,
    complexity: req.complexity,
    goal: req.goal,
  }));
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS, with every test green.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/data/demoSketches.ts src/lib/sketches.ts src/lib/sketches.test.ts
git commit -m "feat: add demo idea pool and demo sketch builder

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `POST /api/generate-ideas` endpoint

**Files:**
- Modify: `server.ts`. Add an import near line 9, and insert the new route after the `/api/generate-idea` handler, which ends around line 275, and before the `// 2. API: Refine Idea` comment.

**Interfaces:**
- Consumes: `normalizeGenerateIdeasRequest`, `parseSketches`, `buildDemoSketches`, `CONCRETE_LANGUAGES`, `CONCRETE_DOMAINS`, and `DEFAULT_SKETCH_MODEL` from `src/lib/sketches.ts`. Also uses the existing `ai`, `getValidModel`, and `Type`.
- Produces: an HTTP contract.
  - `POST /api/generate-ideas` takes the body `Partial<GenerateIdeasRequest>`.
  - Demo mode responds with `200 { sketches: IdeaSketch[], isMock: true }`.
  - Live mode responds with `200 { sketches: IdeaSketch[], model: string }`.
  - `502 { error: 'Model returned no usable ideas' }`
  - `500 { error: string }`

- [ ] **Step 1: Add the import**

In `server.ts`, after the line `import { IdeaItem } from './src/types/idea.ts';`, add:

```ts
import {
  CONCRETE_DOMAINS,
  CONCRETE_LANGUAGES,
  DEFAULT_SKETCH_MODEL,
  buildDemoSketches,
  normalizeGenerateIdeasRequest,
  parseSketches,
} from './src/lib/sketches.ts';
import type { ProjectGoal } from './src/types/idea.ts';
```

- [ ] **Step 2: Add the route**

Insert this block directly after the closing `});` of the `/api/generate-idea` handler. That puts it on the blank line just above the `// ----` separator that comes before `// 2. API: Refine Idea (Deep Dive Technical Breakdown)`:

```ts
// ----------------------------------------------------
// 1b. API: Quick Idea Sketches (batch of short ideas)
// ----------------------------------------------------
const GOAL_GUIDANCE: Record<ProjectGoal, string> = {
  Learning: 'favor ideas that teach a core concept and can be built incrementally.',
  Portfolio: 'favor ideas with a visible, demo-able result that impresses reviewers.',
  'Interview Prep': 'favor ideas that exercise classic system-design and data-structure trade-offs.',
  'Real-World Tool': 'favor ideas that solve a genuine everyday problem the builder would actually use.',
};

const SKETCH_ANGLES = [
  'an unusual data source',
  'a gap in developer tooling',
  'performance-critical internals',
  'a teaching or visualization tool',
  'offline-first or local-first design',
  'something playful or fun to demo',
  'reliability under failure',
];

app.post('/api/generate-ideas', async (req: Request, res: Response) => {
  try {
    const ideasReq = normalizeGenerateIdeasRequest(req.body);

    if (!ai) {
      return res.json({ sketches: buildDemoSketches(ideasReq), isMock: true });
    }

    const chosenModel = getValidModel(ideasReq.model ?? DEFAULT_SKETCH_MODEL);
    const angle = SKETCH_ANGLES[Math.floor(Math.random() * SKETCH_ANGLES.length)];
    const languageRule =
      ideasReq.language === 'Any Language'
        ? `choose a fitting language per idea and vary them across the batch. Use one of: ${CONCRETE_LANGUAGES.join(', ')}`
        : ideasReq.language;
    const domainRule =
      ideasReq.domain === 'Any Domain'
        ? `spread ideas across different domains. Use one of: ${CONCRETE_DOMAINS.join(', ')}`
        : ideasReq.domain;

    const systemPrompt = `You are the lead engineering architect at IdeaFactory, pitching short software project ideas.
RULES:
1. Avoid generic beginner fluff (NO basic todo apps, generic blog CMS, or simple weather wrappers).
2. Every idea in the batch must be a genuinely different problem, not a rename of another.
3. Size each idea for this complexity level: ${ideasReq.complexity}.
4. Builder's goal: ${ideasReq.goal} — ${GOAL_GUIDANCE[ideasReq.goal]}
5. Language: ${languageRule}.
6. Domain: ${domainRule}.
7. Creative angle for this batch: ${angle}.
${ideasReq.avoidTitles.length ? `8. Do not repeat or lightly rephrase these previous ideas: ${ideasReq.avoidTitles.join('; ')}` : ''}

Return a strictly valid JSON object matching the requested schema.`;

    const response = await ai.models.generateContent({
      model: chosenModel,
      contents: `Pitch exactly ${ideasReq.count} project ideas.`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ideas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'Short, catchy project name' },
                  pitch: { type: Type.STRING, description: 'One or two sentence elevator pitch' },
                  whyItFits: { type: Type.STRING, description: "One sentence on why it suits the builder's goal" },
                  estimatedHours: { type: Type.STRING, description: 'Realistic time estimate, e.g. 15-25 hours' },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: '2-5 short tags' },
                  language: { type: Type.STRING, description: 'Primary programming language' },
                  domain: { type: Type.STRING, description: 'Technical domain' },
                },
                required: ['title', 'pitch', 'whyItFits', 'estimatedHours', 'tags', 'language', 'domain'],
              },
            },
          },
          required: ['ideas'],
        },
      },
    });

    let parsed: unknown = {};
    try {
      parsed = JSON.parse(response.text || '{}');
    } catch {
      parsed = {};
    }

    const sketches = parseSketches(parsed, ideasReq);
    if (sketches.length === 0) {
      return res.status(502).json({ error: 'Model returned no usable ideas' });
    }

    res.json({ sketches, model: chosenModel });
  } catch (error: any) {
    console.error('Error generating idea sketches:', error);
    res.status(500).json({ error: error.message || 'Failed to generate ideas' });
  }
});

```

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Smoke-test in demo mode**

Start the server in the background with an empty key. `dotenv` does not override a variable that is already set, so this forces demo mode even when `.env` contains a key:

```bash
GEMINI_API_KEY= PORT=3101 DISABLE_HMR=true npx tsx server.ts
```

Once it logs that it is listening, run:

```bash
curl -s -X POST http://localhost:3101/api/generate-ideas -H 'Content-Type: application/json' \
  -d '{"domain":"Database Engines","goal":"Learning","count":3}'
```
Expected: JSON with `"isMock":true` and 3 sketches. Every sketch has `"domain":"Database Engines"` and `"goal":"Learning"`.

```bash
curl -s -X POST http://localhost:3101/api/generate-ideas -H 'Content-Type: application/json' -d 'null'
curl -s -X POST http://localhost:3101/api/generate-ideas -H 'Content-Type: application/json' -d '{"count":"abc","language":"COBOL"}'
```
Expected: each returns 5 sketches and HTTP 200.

```bash
curl -s http://localhost:3101/api/ideas | head -c 200
```
Note `"total"`, then run the first command again and check `total` again. Expected: `total` is unchanged, because sketches are not persisted.

Stop the server.

- [ ] **Step 5: Commit**

```bash
git add server.ts
git commit -m "feat: add /api/generate-ideas endpoint for quick idea batches

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Client API helpers

**Files:**
- Create: `src/lib/ideasApi.ts`
- Test: `src/lib/ideasApi.test.ts`

**Interfaces:**
- Consumes: `buildExpandPrompt` and `ExpandSource` from `src/lib/sketches.ts`, plus the HTTP contract from Task 4 and the existing `POST /api/ideas` (`201 { idea }`) and `POST /api/generate-idea` (`200 { idea }`).
- Produces:
  - `interface GenerateIdeasResult { sketches: IdeaSketch[]; isMock: boolean }`
  - `requestIdeas(params: GenerateIdeasRequest, signal?: AbortSignal): Promise<GenerateIdeasResult>`
  - `saveDraft(draft: IdeaItem): Promise<IdeaItem>`
  - `expandToSpec(source: ExpandSource, model: string): Promise<IdeaItem>`
  - On failure, each function throws an `Error` whose message is the server's `error` field, or a fallback message.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/ideasApi.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expandToSpec, requestIdeas, saveDraft } from './ideasApi';
import { DEFAULT_IDEAS_REQUEST, buildExpandPrompt } from './sketches';
import type { IdeaItem } from '../types/idea';

function mockFetch(response: Response) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fn);
  return fn;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const sentBody = (fn: ReturnType<typeof vi.fn>) => JSON.parse(fn.mock.calls[0][1].body);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('requestIdeas', () => {
  it('posts the request and returns sketches and the demo flag', async () => {
    const fn = mockFetch(json(200, { sketches: [{ id: 's1' }], isMock: true }));
    const result = await requestIdeas(DEFAULT_IDEAS_REQUEST);
    expect(fn.mock.calls[0][0]).toBe('/api/generate-ideas');
    expect(sentBody(fn)).toEqual(DEFAULT_IDEAS_REQUEST);
    expect(result).toEqual({ sketches: [{ id: 's1' }], isMock: true });
  });

  it("throws the server's error message", async () => {
    mockFetch(json(502, { error: 'Model returned no usable ideas' }));
    await expect(requestIdeas(DEFAULT_IDEAS_REQUEST)).rejects.toThrow('Model returned no usable ideas');
  });

  it('throws a fallback message when the error body is not JSON', async () => {
    mockFetch(new Response('oops', { status: 500 }));
    await expect(requestIdeas(DEFAULT_IDEAS_REQUEST)).rejects.toThrow('Idea generation failed (500)');
  });
});

describe('saveDraft', () => {
  it('posts the draft to /api/ideas and returns the stored idea', async () => {
    const draft = { id: 'draft-1', title: 'T' } as IdeaItem;
    const fn = mockFetch(json(201, { idea: draft, success: true }));
    await expect(saveDraft(draft)).resolves.toEqual(draft);
    expect(fn.mock.calls[0][0]).toBe('/api/ideas');
    expect(sentBody(fn)).toEqual(draft);
  });
});

describe('expandToSpec', () => {
  const source = {
    title: 'Tiny KV',
    pitch: 'A tiny key-value store.',
    language: 'Go' as const,
    domain: 'Database Engines' as const,
    complexity: 'Advanced' as const,
    goal: 'Learning' as const,
  };

  it('calls /api/generate-idea with the expand prompt and returns the idea', async () => {
    const idea = { id: 'idea-1', title: 'Tiny KV' } as IdeaItem;
    const fn = mockFetch(json(200, { idea }));
    await expect(expandToSpec(source, 'gemini-3.8-flash')).resolves.toEqual(idea);
    expect(fn.mock.calls[0][0]).toBe('/api/generate-idea');
    expect(sentBody(fn)).toEqual({
      language: 'Go',
      complexity: 'Advanced',
      domain: 'Database Engines',
      customPrompt: buildExpandPrompt(source),
      constraints: [],
      model: 'gemini-3.8-flash',
    });
  });

  it('throws when the response has no idea', async () => {
    mockFetch(json(200, {}));
    await expect(expandToSpec(source, 'gemini-3.8-flash')).rejects.toThrow('No specification was returned');
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test`
Expected: FAIL, because `./ideasApi` cannot be resolved.

- [ ] **Step 3: Write the implementation**

Create `src/lib/ideasApi.ts`:

```ts
import type { GenerateIdeasRequest, IdeaItem, IdeaSketch } from '../types/idea';
import { buildExpandPrompt, type ExpandSource } from './sketches';

export interface GenerateIdeasResult {
  sketches: IdeaSketch[];
  isMock: boolean;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return typeof data?.error === 'string' && data.error ? data.error : fallback;
  } catch {
    return fallback;
  }
}

export async function requestIdeas(
  params: GenerateIdeasRequest,
  signal?: AbortSignal
): Promise<GenerateIdeasResult> {
  const res = await fetch('/api/generate-ideas', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(params),
    signal,
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Idea generation failed (${res.status})`));
  }
  const data = await res.json();
  return { sketches: Array.isArray(data.sketches) ? data.sketches : [], isMock: !!data.isMock };
}

export async function saveDraft(draft: IdeaItem): Promise<IdeaItem> {
  const res = await fetch('/api/ideas', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(draft),
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Saving failed (${res.status})`));
  }
  const data = await res.json();
  return data.idea ?? draft;
}

export async function expandToSpec(source: ExpandSource, model: string): Promise<IdeaItem> {
  const res = await fetch('/api/generate-idea', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      language: source.language,
      complexity: source.complexity,
      domain: source.domain,
      customPrompt: buildExpandPrompt(source),
      constraints: [],
      model,
    }),
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Expanding failed (${res.status})`));
  }
  const data = await res.json();
  if (!data.idea) {
    throw new Error('No specification was returned');
  }
  return data.idea;
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS, with every test green.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ideasApi.ts src/lib/ideasApi.test.ts
git commit -m "feat: add client helpers for idea batches, drafts, and expansion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Ideas tab UI (IdeasView, SketchCard, Navbar, App wiring)

**Files:**
- Create: `src/components/SketchCard.tsx`
- Create: `src/components/IdeasView.tsx`
- Modify: `src/components/Navbar.tsx` (import list line 2–10, `ActiveTab` line 12, `navItems` line 30)
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `requestIdeas`, `saveDraft`, and `expandToSpec` (Task 5); the option lists, `DEFAULT_IDEAS_REQUEST`, `DEFAULT_SKETCH_MODEL`, and `sketchToDraftIdea` (Tasks 1–2).
- Produces:
  - `IdeasOptions`, `SketchBatch`, `DEFAULT_IDEAS_OPTIONS`, `EMPTY_SKETCH_BATCH`, and `IdeasView`, exported from `IdeasView.tsx`.
  - `ActiveTab` now includes `'ideas'`.
  - In `App`: `handleExpanded(idea: IdeaItem, draftId?: string): void`. Task 7 also uses this function.

The UI has no automated test. It is verified with lint, build, and the manual browser pass in Task 8.

- [ ] **Step 1: Create `src/components/SketchCard.tsx`**

```tsx
import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, Bookmark, Check, Clock } from 'lucide-react';
import { IdeaSketch } from '../types/idea';

interface SketchCardProps {
  sketch: IdeaSketch;
  isSaved: boolean;
  onSave: (sketch: IdeaSketch) => Promise<void>;
  onExpand: (sketch: IdeaSketch) => Promise<void>;
}

type CardAction = 'save' | 'expand';

export const SketchCard: React.FC<SketchCardProps> = ({ sketch, isSaved, onSave, onExpand }) => {
  const [busy, setBusy] = useState<CardAction | null>(null);
  const [error, setError] = useState('');

  const run = async (action: CardAction, handler: (sketch: IdeaSketch) => Promise<void>) => {
    setBusy(action);
    setError('');
    try {
      await handler(sketch);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${action} this idea.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-slate-700 transition-colors">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span className="text-emerald-400 font-semibold">{sketch.language}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="truncate">{sketch.domain}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="flex items-center gap-1 flex-shrink-0">
            <Clock className="w-3 h-3 text-slate-500" />
            {sketch.estimatedHours}
          </span>
        </div>

        <h3 className="text-base font-bold text-slate-100">{sketch.title}</h3>
        <p className="text-xs text-slate-300 leading-relaxed">{sketch.pitch}</p>

        {sketch.whyItFits && (
          <p className="text-[11px] text-slate-400 leading-relaxed">
            <span className="text-amber-400/90 font-semibold">{sketch.goal}:</span> {sketch.whyItFits}
          </p>
        )}

        {sketch.tags.length > 0 && (
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-400 font-mono">
            {sketch.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {error && (
          <p role="alert" className="text-[11px] text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{error}</span>
          </p>
        )}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => run('save', onSave)}
            disabled={isSaved || busy !== null}
            className="px-3 py-1.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 hover:text-slate-100 hover:border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            {isSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Saved</span>
              </>
            ) : busy === 'save' ? (
              <span>Saving…</span>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5" />
                <span>Save</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => run('expand', onExpand)}
            disabled={busy !== null}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            {busy === 'expand' ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Expanding…</span>
              </>
            ) : (
              <>
                <span>Expand to spec</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
};
```

- [ ] **Step 2: Create `src/components/IdeasView.tsx`**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Lightbulb, RotateCcw, Sparkles } from 'lucide-react';
import {
  ComplexityLevel,
  DomainChoice,
  IdeaCount,
  IdeaItem,
  IdeaSketch,
  ProgrammingLanguage,
  ProjectGoal,
} from '../types/idea';
import {
  COMPLEXITY_OPTIONS,
  COUNT_OPTIONS,
  DEFAULT_IDEAS_REQUEST,
  DEFAULT_SKETCH_MODEL,
  DOMAIN_OPTIONS,
  GOAL_OPTIONS,
  LANGUAGE_OPTIONS,
  sketchToDraftIdea,
} from '../lib/sketches';
import { expandToSpec, requestIdeas, saveDraft } from '../lib/ideasApi';
import { SketchCard } from './SketchCard';

export interface IdeasOptions {
  language: ProgrammingLanguage;
  complexity: ComplexityLevel;
  domain: DomainChoice;
  goal: ProjectGoal;
  count: IdeaCount;
  model: string;
}

export interface SketchBatch {
  sketches: IdeaSketch[];
  isMock: boolean;
  savedDraftIds: Record<string, string>; // sketch id -> saved draft id
}

export const DEFAULT_IDEAS_OPTIONS: IdeasOptions = {
  language: DEFAULT_IDEAS_REQUEST.language,
  complexity: DEFAULT_IDEAS_REQUEST.complexity,
  domain: DEFAULT_IDEAS_REQUEST.domain,
  goal: DEFAULT_IDEAS_REQUEST.goal,
  count: DEFAULT_IDEAS_REQUEST.count,
  model: DEFAULT_SKETCH_MODEL,
};

export const EMPTY_SKETCH_BATCH: SketchBatch = { sketches: [], isMock: false, savedDraftIds: {} };

const MODEL_OPTIONS = [
  { value: 'gemini-3.1-flash-lite', label: 'gemini-3.1-flash-lite (Fastest)' },
  { value: 'gemini-3.8-flash', label: 'gemini-3.8-flash' },
  { value: 'gemini-3.5-flash', label: 'gemini-3.5-flash' },
  { value: 'gemini-3.1-pro-preview', label: 'gemini-3.1-pro-preview (Slow)' },
];

interface ChipRowProps<T extends string | number> {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  format?: (value: T) => string;
}

function ChipRow<T extends string | number>({ label, options, value, onChange, format = String }: ChipRowProps<T>) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2">
      <span className="w-20 flex-shrink-0 pt-1.5 text-xs font-medium text-slate-400">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = option === value;
          return (
            <button
              key={String(option)}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                selected
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/50 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {format(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface IdeasViewProps {
  options: IdeasOptions;
  setOptions: (options: IdeasOptions) => void;
  batch: SketchBatch;
  setBatch: React.Dispatch<React.SetStateAction<SketchBatch>>;
  onSaveDraft: (draft: IdeaItem) => void;
  onExpanded: (idea: IdeaItem, draftId?: string) => void;
}

export const IdeasView: React.FC<IdeasViewProps> = ({
  options,
  setOptions,
  batch,
  setBatch,
  onSaveDraft,
  onExpanded,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const hasBatch = batch.sketches.length > 0;

  // Changing any option cancels an in-flight request so a stale batch never lands.
  const updateOptions = (patch: Partial<IdeasOptions>) => {
    abortRef.current?.abort();
    setOptions({ ...options, ...patch });
  };

  const runGenerate = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsGenerating(true);
    setError('');

    try {
      const { model, ...params } = options;
      const result = await requestIdeas(
        { ...params, avoidTitles: batch.sketches.map((sketch) => sketch.title), model },
        controller.signal
      );
      setBatch({ sketches: result.sketches, isMock: result.isMock, savedDraftIds: {} });
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Failed to generate ideas. Please try again.');
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsGenerating(false);
      }
    }
  };

  const handleSave = async (sketch: IdeaSketch) => {
    const draft = await saveDraft(sketchToDraftIdea(sketch));
    onSaveDraft(draft);
    setBatch((prev) => ({ ...prev, savedDraftIds: { ...prev.savedDraftIds, [sketch.id]: draft.id } }));
  };

  const handleExpand = async (sketch: IdeaSketch) => {
    const idea = await expandToSpec(sketch, options.model);
    onExpanded(idea, batch.savedDraftIds[sketch.id]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1.5 uppercase tracking-wider">
            <span>Idea Lab</span>
            {batch.isMock && (
              <>
                <span>·</span>
                <span className="text-amber-400">Demo mode</span>
              </>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Quick Idea Generator</h1>
          <p className="mt-1 text-sm text-slate-400 max-w-2xl">
            Pick a few options and generate a batch of project ideas. Save the ones you like, or expand one into a full specification.
          </p>
        </div>
        <label className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
          <span>Model:</span>
          <select
            value={options.model}
            onChange={(e) => updateOptions({ model: e.target.value })}
            className="bg-slate-950 text-slate-200 border border-slate-800 rounded px-2 py-0.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-400"
          >
            {MODEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Parameter chips */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
        <ChipRow
          label="Language"
          options={LANGUAGE_OPTIONS}
          value={options.language}
          onChange={(language) => updateOptions({ language })}
          format={(language) => (language === 'Any Language' ? 'Any' : language)}
        />
        <ChipRow
          label="Level"
          options={COMPLEXITY_OPTIONS}
          value={options.complexity}
          onChange={(complexity) => updateOptions({ complexity })}
        />
        <ChipRow
          label="Domain"
          options={DOMAIN_OPTIONS}
          value={options.domain}
          onChange={(domain) => updateOptions({ domain })}
          format={(domain) => (domain === 'Any Domain' ? 'Any' : domain)}
        />
        <ChipRow label="Goal" options={GOAL_OPTIONS} value={options.goal} onChange={(goal) => updateOptions({ goal })} />
        <ChipRow label="Ideas" options={COUNT_OPTIONS} value={options.count} onChange={(count) => updateOptions({ count })} />

        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {error ? (
            <p role="alert" className="text-xs text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
              <button
                type="button"
                onClick={runGenerate}
                className="ml-1 inline-flex items-center gap-1 text-rose-300 underline hover:text-rose-200"
              >
                <RotateCcw className="w-3 h-3" />
                Retry
              </button>
            </p>
          ) : (
            <span className="text-[11px] text-slate-500">
              {hasBatch ? 'Generate again for a fresh batch.' : 'The defaults work fine. Just press Generate.'}
            </span>
          )}
          <button
            type="button"
            onClick={runGenerate}
            disabled={isGenerating}
            className="sm:w-56 py-3 px-4 rounded-xl font-semibold text-xs tracking-wide uppercase bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Generating…</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{hasBatch ? 'Generate new ideas' : 'Generate ideas'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {isGenerating ? (
        <div aria-busy="true" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: options.count }, (_, index) => (
            <div key={index} className="h-56 rounded-2xl border border-slate-800 bg-slate-900/50 animate-pulse" />
          ))}
        </div>
      ) : hasBatch ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {batch.sketches.map((sketch) => (
            <SketchCard
              key={sketch.id}
              sketch={sketch}
              isSaved={!!batch.savedDraftIds[sketch.id]}
              onSave={handleSave}
              onExpand={handleExpand}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-12 text-slate-500 space-y-3 border border-dashed border-slate-800 rounded-2xl">
          <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600">
            <Lightbulb className="w-6 h-6" />
          </div>
          <h3 className="text-base font-medium text-slate-300">No ideas yet</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            Choose your options above, then click <span className="text-emerald-400">Generate ideas</span> to get a batch of project ideas.
          </p>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Add the Ideas tab to `src/components/Navbar.tsx`**

In the lucide import block, add `Lightbulb,` after `Sparkles,`.

Replace:
```ts
export type ActiveTab = 'generator' | 'refiner' | 'repository' | 'architecture' | 'chat';
```
with:
```ts
export type ActiveTab = 'ideas' | 'generator' | 'refiner' | 'repository' | 'architecture' | 'chat';
```

In `navItems`, insert this as the first array element, before the `id: 'generator'` entry:
```ts
    {
      id: 'ideas',
      label: 'Ideas',
      icon: <Lightbulb className="w-4 h-4 text-yellow-300" />,
    },
```

- [ ] **Step 4: Wire the Ideas tab into `src/App.tsx`**

Add these imports after `import { ChatbotView } from './components/ChatbotView';`:
```ts
import {
  IdeasView,
  IdeasOptions,
  SketchBatch,
  DEFAULT_IDEAS_OPTIONS,
  EMPTY_SKETCH_BATCH,
} from './components/IdeasView';
```

Replace:
```ts
  const [activeTab, setActiveTab] = useState<ActiveTab>('generator');
```
with:
```ts
  const [activeTab, setActiveTab] = useState<ActiveTab>('ideas');
```

After the line `const [chatIdeaContext, setChatIdeaContext] = useState<IdeaItem | null>(SEED_IDEAS[0]);`, add:
```ts
  // Ideas tab state lives here so it survives tab switches.
  const [ideasOptions, setIdeasOptions] = useState<IdeasOptions>(DEFAULT_IDEAS_OPTIONS);
  const [sketchBatch, setSketchBatch] = useState<SketchBatch>(EMPTY_SKETCH_BATCH);
```

Immediately after the closing `};` of `handleAddNewManualIdea`, add:
```ts
  const handleSaveDraft = (draft: IdeaItem) => {
    setIdeas((prev) => [draft, ...prev.filter((item) => item.id !== draft.id)]);
  };

  // A freshly expanded spec replaces its draft (if any) and opens in the Generator.
  const handleExpanded = (idea: IdeaItem, draftId?: string) => {
    if (draftId) {
      void handleDeleteIdea(draftId);
    }
    setIdeas((prev) => [idea, ...prev.filter((item) => item.id !== idea.id)]);
    setCurrentIdea(idea);
    setActiveTab('generator');
  };
```

In the `<main className="flex-1">` block, insert this before `{activeTab === 'generator' && (`:
```tsx
        {activeTab === 'ideas' && (
          <IdeasView
            options={ideasOptions}
            setOptions={setIdeasOptions}
            batch={sketchBatch}
            setBatch={setSketchBatch}
            onSaveDraft={handleSaveDraft}
            onExpanded={handleExpanded}
          />
        )}

```

- [ ] **Step 5: Type-check, test, and build**

Run: `npm run lint && npm test && npm run build`
Expected: no type errors, all tests pass, and the Vite build completes.

- [ ] **Step 6: Quick manual check**

Run `GEMINI_API_KEY= PORT=3101 npx tsx server.ts` and open http://localhost:3101. Confirm the following:
- The app opens on the **Ideas** tab.
- Generate shows skeleton cards, then 5 idea cards and a "Demo mode" label.
- Generating again shows a different set of ideas.
- **Save** changes the button to "Saved", and the Repository count in the navbar goes up by one.
- **Expand to spec** switches to the Generator tab with a spec loaded.

Stop the server afterwards.

- [ ] **Step 7: Commit**

```bash
git add src/components/SketchCard.tsx src/components/IdeasView.tsx src/components/Navbar.tsx src/App.tsx
git commit -m "feat: add Ideas tab for quick idea batches

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Drafts in the Repository and the detail modal

**Files:**
- Create: `src/components/DraftBadge.tsx`
- Modify: `src/components/RepositoryView.tsx` (grid title ~line 241, architecture preview ~line 254, table title ~line 333)
- Modify: `src/components/IdeaDetailModal.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `handleExpanded` (Task 6), `expandToSpec` (Task 5), `DEFAULT_EXPAND_MODEL` (Task 1).
- Produces:
  - `DraftBadge` component, which takes no props.
  - `IdeaDetailModal` gains the prop `onExpandDraft: (idea: IdeaItem) => Promise<void>`.

- [ ] **Step 1: Create `src/components/DraftBadge.tsx`**

```tsx
import React from 'react';

export const DraftBadge: React.FC = () => (
  <span className="ml-2 align-middle text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-300 border border-amber-500/40 bg-amber-500/10 rounded px-1.5 py-0.5">
    Draft
  </span>
);
```

- [ ] **Step 2: Mark drafts in `src/components/RepositoryView.tsx`**

Add the import after the existing `../utils/export` import:
```ts
import { DraftBadge } from './DraftBadge';
```

In the grid card, replace:
```tsx
                    {idea.title}
                  </h3>
```
with:
```tsx
                    {idea.title}
                    {idea.isDraft && <DraftBadge />}
                  </h3>
```

In the grid card's architecture preview, replace:
```tsx
                  <p className="text-slate-300 line-clamp-2 leading-relaxed">
                    {idea.coreArchitecture}
                  </p>
```
with:
```tsx
                  <p className="text-slate-300 line-clamp-2 leading-relaxed">
                    {idea.coreArchitecture || 'Draft idea. Open it and expand it to generate the architecture.'}
                  </p>
```

In the table, replace:
```tsx
                      <div className="font-semibold text-slate-100">{idea.title}</div>
```
with:
```tsx
                      <div className="font-semibold text-slate-100">
                        {idea.title}
                        {idea.isDraft && <DraftBadge />}
                      </div>
```

- [ ] **Step 3: Add the draft panel to `src/components/IdeaDetailModal.tsx`**

Replace `import React from 'react';` with `import React, { useState } from 'react';`. Then add `Sparkles,` and `AlertTriangle,` to the lucide import list, after `Terminal,`, and add this import after the `../utils/export` import:
```ts
import { DraftBadge } from './DraftBadge';
```

Replace the props interface:
```ts
interface IdeaDetailModalProps {
  idea: IdeaItem | null;
  onClose: () => void;
  onOpenInRefiner: (idea: IdeaItem) => void;
  onOpenInChat: (idea: IdeaItem) => void;
  onToggleBookmark: (idea: IdeaItem) => void;
}
```
with:
```ts
interface IdeaDetailModalProps {
  idea: IdeaItem | null;
  onClose: () => void;
  onOpenInRefiner: (idea: IdeaItem) => void;
  onOpenInChat: (idea: IdeaItem) => void;
  onToggleBookmark: (idea: IdeaItem) => void;
  onExpandDraft: (idea: IdeaItem) => Promise<void>;
}

const DraftExpandPanel: React.FC<{ idea: IdeaItem; onExpandDraft: (idea: IdeaItem) => Promise<void> }> = ({
  idea,
  onExpandDraft,
}) => {
  const [isExpanding, setIsExpanding] = useState(false);
  const [error, setError] = useState('');

  const handleExpand = async () => {
    setIsExpanding(true);
    setError('');
    try {
      await onExpandDraft(idea);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not expand this idea.');
      setIsExpanding(false);
    }
  };

  return (
    <div className="p-5 rounded-xl bg-slate-950/70 border border-amber-500/30 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-300">Draft idea</h3>
      <p className="text-slate-300 leading-relaxed text-xs">{idea.problemStatement}</p>
      <p className="text-slate-400 text-[11px]">
        This is a saved quick idea. Expand it to generate the architecture, roadmap, challenges, and interview notes.
      </p>
      <button
        type="button"
        onClick={handleExpand}
        disabled={isExpanding}
        className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExpanding ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            <span>Expanding…</span>
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            <span>Expand to full spec</span>
          </>
        )}
      </button>
      {error && (
        <p role="alert" className="text-xs text-rose-400 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};
```

In the component's destructured props, add `onExpandDraft,` after `onToggleBookmark,`.

Mark drafts in the header. Replace:
```tsx
            <h2 className="text-2xl font-bold text-slate-100">{idea.title}</h2>
```
with:
```tsx
            <h2 className="text-2xl font-bold text-slate-100">
              {idea.title}
              {idea.isDraft && <DraftBadge />}
            </h2>
```

Show the draft panel instead of the empty sections. Replace:
```tsx
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-300">
          {/* Section 1: Problem & Architecture */}
```
with:
```tsx
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-300">
          {idea.isDraft ? (
            <DraftExpandPanel idea={idea} onExpandDraft={onExpandDraft} />
          ) : (
          <>
          {/* Section 1: Problem & Architecture */}
```
Then replace the end of the body, which is the closing tags of Section 6 followed by the footer comment:
```tsx
            </div>
          </div>
        </div>

        {/* Modal Footer Toolbar */}
```
with:
```tsx
            </div>
          </div>
          </>
          )}
        </div>

        {/* Modal Footer Toolbar */}
```
Finally, indent every line between the new `<>` and `</>` by two more spaces so that the nesting reads correctly.

- [ ] **Step 4: Wire `onExpandDraft` in `src/App.tsx`**

Add these imports after the IdeasView import:
```ts
import { expandToSpec } from './lib/ideasApi';
import { DEFAULT_EXPAND_MODEL } from './lib/sketches';
```

After `handleExpanded`, add:
```ts
  // Errors propagate so the modal can show them next to its Expand button.
  const handleExpandDraft = async (draft: IdeaItem) => {
    const idea = await expandToSpec(
      {
        title: draft.title,
        pitch: draft.tagline,
        language: draft.language,
        domain: draft.domain,
        complexity: draft.complexity,
        goal: draft.goal,
      },
      DEFAULT_EXPAND_MODEL
    );
    setInspectingIdea(null);
    handleExpanded(idea, draft.id);
  };
```

In the `<IdeaDetailModal` JSX, add this prop after `onToggleBookmark={handleToggleBookmark}`:
```tsx
          onExpandDraft={handleExpandDraft}
```

- [ ] **Step 5: Type-check, test, and build**

Run: `npm run lint && npm test && npm run build`
Expected: no type errors, all tests pass, and the build completes.

- [ ] **Step 6: Quick manual check**

Run `GEMINI_API_KEY= PORT=3101 npx tsx server.ts` and open http://localhost:3101. Then do the following:
- On the Ideas tab, generate and **Save** one idea.
- Open the **Repository**. The idea shows a **Draft** badge in both the grid and the table views, and its card has the fallback architecture text.
- Click the idea's title. The modal shows the Draft panel and does not show empty sections.
- Click **Expand to full spec**. The modal closes, the Generator shows the spec, and the draft is gone from the Repository while the new spec is listed.

Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/components/DraftBadge.tsx src/components/RepositoryView.tsx src/components/IdeaDetailModal.tsx src/App.tsx
git commit -m "feat: show draft ideas in Repository and expand them from the modal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: README, full verification, graph update

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: the finished feature.
- Produces: documentation and a verified branch.

- [ ] **Step 1: Update `README.md`**

Make these exact edits.

1. In the Features table, add this row directly under the header separator row `| --- | --- |`:
```markdown
| **Ideas** | Pick a language, level, domain, goal, and batch size (3, 5, or 8) with one click each, then generate several short project ideas at once. Save an idea to the Repository as a draft or expand it into a full specification. |
```

2. In the "Current implementation" section, replace the bullet that starts with `- **Demo mode uses canned responses.**` with:
```markdown
- **Demo mode uses canned responses.** With `GEMINI_API_KEY` unset or empty, generation, refinement, and chat return local sample output. Demo generation uses a fixed template and does not provide genuine AI reasoning about custom prompts or constraints. Quick ideas in demo mode are drawn from a local pool of 30 hand-written ideas.
```

3. In "Typical workflow", replace step 1 with:
```markdown
1. Open **Ideas**, click your options, and press **Generate ideas**. Generate again for a fresh batch. Save promising ideas as drafts, or expand one straight into a full specification in **Generator**. You can also start in **Generator** directly or inspect a seeded idea in **Repository**.
```

4. In the Development commands table, add this row after the `npm run lint` row:
```markdown
| `npm test` | Run the Vitest unit tests once. |
```

5. In the Verification section, replace:
~~~markdown
```bash
npm run lint
npm run build
```

There is currently no automated test suite or `npm test` script. For a basic API smoke check while the development server is running:
~~~
with:
~~~markdown
```bash
npm run lint
npm test
npm run build
```

Unit tests cover the quick-idea logic in `src/lib/`; there are no UI tests. For a basic API smoke check while the development server is running:
~~~
Then, after the existing `curl -X POST http://localhost:3000/api/generate-idea ...` example inside the same code block, add:
~~~bash

curl -X POST http://localhost:3000/api/generate-ideas \
  -H 'Content-Type: application/json' \
  -d '{"domain":"Database Engines","goal":"Learning","count":3}'
~~~
After the paragraph that starts "The second request adds an idea", add: `The third request returns short idea sketches and does not add anything to the catalog.`

6. In the API overview table, add this row after the `/api/generate-idea` row:
```markdown
| `POST` | `/api/generate-ideas` | Return 3, 5, or 8 short idea sketches; accepts `language`, `complexity`, `domain`, `goal`, `count`, `avoidTitles`, and `model`. Sketches are not added to the catalog. |
```

7. In the Project structure tree, add these components under `components/`, directly below the `├── components/` line:
```text
│   │   ├── IdeasView.tsx
│   │   ├── SketchCard.tsx
│   │   ├── DraftBadge.tsx
```
Add this line directly below the `├── data/seedIdeas.ts` line:
```text
│   ├── data/demoSketches.ts       # Demo-mode quick ideas
│   ├── lib/sketches.ts           # Quick-idea validation, parsing, demo selection, drafts
│   ├── lib/ideasApi.ts           # Client fetch helpers for ideas, drafts, expansion
```

- [ ] **Step 2: Run the full automated verification**

Run: `npm run lint && npm test && npm run build`
Expected: all three succeed. Record the test count from the Vitest summary.

- [ ] **Step 3: Full manual pass in demo mode, in a browser**

Run `GEMINI_API_KEY= PORT=3101 npx tsx server.ts` and open http://localhost:3101. Check each item:
- [ ] The app opens on **Ideas**, the defaults are selected, and the empty state is shown.
- [ ] **Generate ideas** shows 5 skeletons, then 5 cards, and "Demo mode" appears in the header.
- [ ] Generating again gives a set of titles that does not overlap the previous one.
- [ ] Selecting **Domain → Database Engines** and **Ideas → 3** gives 3 Database Engines cards.
- [ ] Changing a chip right after clicking Generate leaves the spinner cleared and no stale batch appears. This is Review Focus item 5.
- [ ] **Save** shows "Saved", and the Repository shows the card with a **Draft** badge.
- [ ] **Expand to spec** on the saved card opens the Generator with a spec, and the draft is removed from the Repository.
- [ ] Switching to another tab and back to Ideas keeps the current batch and options.
- [ ] A draft saved and then expanded from the Repository modal works as described in Task 7.
- [ ] The existing Generator, Refiner, Chat, and Architecture tabs still work as before.

Stop the server. If a real `GEMINI_API_KEY` is available, also run one live Generate and one live Expand using `npm run dev`, and state in the handoff which checks were demo-only.

- [ ] **Step 4: Refresh the knowledge graph**

Run: `graphify update .`
Expected: completes without error. If `graphify` is not on PATH, note that in the handoff and move on.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: document Ideas tab, generate-ideas endpoint, and npm test

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
If `graphify update .` changed tracked files under `graphify-out/`, add them to this commit as well.
