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
import { DEMO_SKETCH_POOL, GOAL_REASONS, type DemoSketchSeed } from '../data/demoSketches';

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
