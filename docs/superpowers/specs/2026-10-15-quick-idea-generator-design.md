# Quick Idea Generator — Design

**Date:** 2026-10-15
**Status:** Approved in brainstorming, pending written-spec review
**Branch:** `feat/quick-idea-generator`

## Intent

IdeaFactory currently generates one detailed specification at a time. That is slow and assumes you already know what you want to build. This feature adds a fast first step: click a few options, press **Generate**, and get several short project ideas in seconds. You can re-roll as often as you like, save the interesting ideas as drafts, or expand one into the existing full-spec flow.

**User-stated requirements**
- Users choose parameters by clicking. There are no required text fields.
- One click on Generate returns several ideas quickly. Generating again returns different ideas.
- Each idea can be **saved to the Repository as-is**, **expanded into a full spec**, or both.
- The parameters are language, complexity, domain, **goal**, and **number of ideas**.
- The feature lives in a new **Ideas** tab.

**Assumptions agreed during design**
- "Quick" means a few seconds per batch, so the default model is `gemini-3.1-flash-lite`.
- Demo mode, with no API key, still returns varied ideas.
- The Generator, Refiner, Chat, and Architecture views keep their current behavior.
- The Ideas tab becomes the first tab and the default view.

**Success criteria**
- With the default options, a new user can get ideas in one click.
- In demo mode, two consecutive Generate clicks with the same options return different idea sets.
- A saved idea appears in the Repository with a **Draft** marker. Expanding it produces a full spec that replaces the draft.

## Approach

Add a lightweight batch endpoint that returns N short **sketches** from one structured Gemini call. Expanding a sketch reuses the existing `/api/generate-idea` endpoint. Saving a sketch converts it to an `IdeaItem` draft and uses the existing `POST /api/ideas` endpoint.

Rejected alternatives:
- **Generate N full specs in parallel.** Too slow and expensive for each click.
- **Use a client-side template combinator only.** Results would be shallow and repetitive. It is used only as the demo-mode fallback.

## Data model (`src/types/idea.ts`)

```ts
export type ProjectGoal = 'Learning' | 'Portfolio' | 'Interview Prep' | 'Real-World Tool';
export type DomainChoice = DomainCategory | 'Any Domain';

export interface IdeaSketch {
  id: string;               // `sketch-<timestamp>-<index>`
  title: string;
  pitch: string;            // 1–2 sentences
  whyItFits: string;        // one sentence tied to the goal
  estimatedHours: string;   // e.g. "15-25 hours"
  tags: string[];           // 2–5
  language: ProgrammingLanguage;   // concrete language; never 'Any Language' after resolution
  domain: DomainCategory;          // concrete domain
  complexity: ComplexityLevel;
  goal: ProjectGoal;
}

export interface GenerateIdeasRequest {
  language: ProgrammingLanguage;   // 'Any Language' allowed
  complexity: ComplexityLevel;
  domain: DomainChoice;
  goal: ProjectGoal;
  count: 3 | 5 | 8;
  avoidTitles?: string[];          // previous batch titles, for re-roll variety
  model?: string;
}
```

`IdeaItem` gains two optional fields: `isDraft?: boolean` and `goal?: ProjectGoal`. Existing seed data and generated ideas are unaffected.

## Pure logic module (`src/lib/sketches.ts`)

This module contains no I/O. The server imports it in the same way it already imports from `src/`, and it is unit-tested.

- `normalizeGenerateIdeasRequest(body: unknown): GenerateIdeasRequest` validates each field against the allowed values. An unknown value falls back to its default: `Any Language`, `Intermediate`, `Any Domain`, `Portfolio`, or count `5`. The function snaps `count` to the nearest of 3, 5, or 8. It keeps at most 10 `avoidTitles` and truncates each one to 120 characters.
- `parseSketches(raw: unknown, req): IdeaSketch[]` keeps only items that have a non-empty `title` and `pitch`. It fills missing optional fields with defaults. It maps `language` and `domain` to concrete allowed values, using the requested value when that value is concrete and otherwise a sensible default such as `TypeScript` or `Full-Stack Architecture`. It drops titles that duplicate another title in the batch or appear in `avoidTitles`, ignoring case, and returns at most `req.count` sketches.
- `buildDemoSketches(req, rng = Math.random): IdeaSketch[]` selects sketches from a local pool of about 30 hand-written ideas spread across the domains, filtered by the requested domain and language unless either is "Any". It excludes `avoidTitles`, shuffles with `rng`, and returns `count` sketches. If the filter leaves too few ideas, it fills the remainder from the unfiltered pool. The pool is stored in `src/data/demoSketches.ts`.
- `sketchToDraftIdea(sketch): IdeaItem` returns an `IdeaItem` with `id: draft-<timestamp>`, `isDraft: true`, `problemStatement: pitch`, `tagline: pitch`, and `coreArchitecture: ''`. Its `techStack` is `{ language, protocols: [], libraries: [] }`, all detail arrays are empty, and `tags` comes from the sketch. It also sets `goal` and `createdAt` to today's date.
- `buildExpandPrompt(sketch): string` produces the `customPrompt` for `/api/generate-idea`. It includes the title, pitch, and goal.

## Server (`server.ts`)

`POST /api/generate-ideas`
1. The handler calls `normalizeGenerateIdeasRequest(req.body)`.
2. Without a Gemini client, it returns `{ sketches: buildDemoSketches(req), isMock: true }`.
3. Otherwise it makes one `generateContent` call. The default model is `gemini-3.1-flash-lite`, and `getValidModel` still applies. The response is JSON, and its schema is an array of `{title, pitch, whyItFits, estimatedHours, tags, language, domain}`. The prompt contains the selections, the goal's meaning, and one random **angle** picked from a short list, for example "unusual data source", "developer tooling gap", "performance-critical", or "teaching tool". It also includes `avoidTitles`, the instruction to return exactly `count` ideas that differ from each other, and the same quality rule as the existing generator: no to-do apps or weather wrappers. When language or domain is "Any", the prompt asks for a mix.
4. The handler runs `parseSketches` on the result. If no sketches remain, it responds with **502** and `{ error: 'Model returned no usable ideas' }`. Otherwise it responds with `{ sketches, model }`.
5. Sketches are **not** added to the in-memory repository.
6. If the Gemini call throws, the handler responds with **500** and `{ error }`, following the existing pattern.

No other endpoint changes. Saving uses `POST /api/ideas`, expanding uses `POST /api/generate-idea`, and draft cleanup uses `DELETE /api/ideas/:id`.

## Client

### `src/components/IdeasView.tsx` (new)
- The **header** shows the title, a model `<select>` that defaults to `gemini-3.1-flash-lite`, and a "Demo mode" note when the last response had `isMock`.
- **Chip rows** are all single-select:
  - Language: `Any Language` followed by the existing list.
  - Level: the four complexities.
  - Domain: `Any Domain` followed by the existing list.
  - Goal: the four goals.
  - Ideas: 3, 5, or 8.

  The defaults are Any Language, Intermediate, Any Domain, Portfolio, and 5.
- The **Generate button** stays disabled while a request is in flight. Changing options during a request aborts that request through an `AbortController`. The request sends `avoidTitles`, which holds the titles in the current batch.
- The **results grid** shows `count` skeleton cards while loading. When the batch arrives, they are replaced by **SketchCard**s. Each card shows the title, estimated hours, language, domain, the pitch, `whyItFits`, tags, and the **Save** and **Expand** buttons.
  - **Save** calls `sketchToDraftIdea`, sends `POST /api/ideas`, and then calls `onSaveDraft(draft)`. After that the button reads "Saved ✓" and is disabled. The card stores the draft id.
  - **Expand** shows a spinner on that card only. It calls `POST /api/generate-idea` with the sketch's language, complexity, domain, `customPrompt: buildExpandPrompt(sketch)`, `constraints: []`, and the selected model. On success it calls `onExpanded(idea, draftId?)`.
- **Errors:** a failed generation shows an inline message with a **Retry** button and leaves the previous batch visible. A failed Save or Expand shows its error on that card only.
- The **empty state**, shown before the first generation, is a short prompt that points to the Generate button.

### `src/App.tsx`
- `ActiveTab` gets a new `'ideas'` tab, which is the default.
- The Ideas state lives in `App` so it survives tab switches: the options, the current sketches, the saved-draft ids for each sketch, and `isMock`. It is passed to `IdeasView` as props with setters.
- `onSaveDraft(draft)` prepends the draft to `ideas`.
- `onExpanded(idea, draftId?)` adds the idea to `ideas`, which the server has already persisted. If `draftId` is set, it calls the existing `handleDeleteIdea(draftId)`. It then sets `currentIdea` to the new idea and switches to the `'generator'` tab.

### `src/components/Navbar.tsx`
- The navbar adds an **Ideas** item, with the `Lightbulb` icon, as the first item.

### Drafts in existing views
- **RepositoryView:** draft entries show a small "Draft" label next to the title in both the grid and the table. No new filter is added.
- **IdeaDetailModal:** for a draft, the modal shows the pitch and an **Expand to full spec** button instead of the empty detail sections. The button calls a new `onExpandDraft(idea)` prop. App implements that prop by calling `/api/generate-idea` with `buildExpandPrompt`, using the draft's fields, and then the same `onExpanded` flow.
- **Generator, Refiner, Chat:** no changes. A draft can still be opened in them, and its sparse fields display as empty lists. This is acceptable for a draft.

## Testing

The repo has no test runner. Add **Vitest** as a dev dependency and an `npm test` script that runs `vitest run`. Write unit tests in `src/lib/sketches.test.ts`:
- `normalizeGenerateIdeasRequest`: valid input passes through unchanged. Unknown enum values fall back to defaults. `count` snaps to 3, 5, or 8. `avoidTitles` is capped and truncated.
- `parseSketches`: drops items without a title or pitch, deduplicates titles ignoring case, excludes `avoidTitles`, caps the result at `count`, and maps invalid language or domain values to concrete values.
- `buildDemoSketches`: returns `count` sketches and respects the domain filter. With a seeded `rng`, it returns different sets when the first batch's titles are passed as `avoidTitles`. It falls back to the full pool when the filter leaves too few ideas.
- `sketchToDraftIdea`: sets `isDraft`, and the result has every required `IdeaItem` field.

**Manual verification:** run `npm run lint`, `npm run build`, and `npm test`. Then run `npm run dev` in demo mode and check the following: generate, re-roll, save and confirm the draft appears in the Repository, expand and confirm the Generator shows the spec and the draft is removed, and open a draft from the Repository modal and expand it. The README is updated to document the Ideas tab, the new endpoint, and `npm test`.

## Out of scope
- Sketch history
- Multi-select chips
- Editing sketches
- Streaming cards as they are generated
- Persistence beyond the existing in-memory catalog
- A Repository filter for drafts
