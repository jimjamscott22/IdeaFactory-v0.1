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
import { DEMO_SKETCH_POOL, GOAL_REASONS, type DemoSketchSeed } from '../data/demoSketches.ts';

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

/** Reads title/pitch back out of an expand prompt produced by buildExpandPrompt. */
export function parseExpandPrompt(customPrompt: string): { title?: string; pitch?: string } {
  const titleMatch = customPrompt.match(/Expand this project idea into a full specification: "([^"]+)"/);
  const pitchMatch = customPrompt.match(/^Pitch: (.+)$/m);
  return {
    title: titleMatch?.[1]?.trim(),
    pitch: pitchMatch?.[1]?.trim(),
  };
}

/** Demo-mode full spec: keeps sketch title/pitch when expanding from the Ideas tab. */
export function buildDemoExpandedIdea(
  params: {
    language: IdeaItem['language'];
    complexity: IdeaItem['complexity'];
    domain: IdeaItem['domain'];
    customPrompt?: string;
  },
  now = Date.now()
): IdeaItem {
  const { title: sketchTitle, pitch: sketchPitch } = parseExpandPrompt(params.customPrompt ?? '');
  const title = sketchTitle || `${params.language} ${params.domain} Core Engine`;
  const tagline =
    sketchPitch ||
    `High-throughput, resilient ${params.domain.toLowerCase()} architecture in ${params.language} designed for ${params.complexity.toLowerCase()} engineers.`;

  return {
    id: `gen-${now}`,
    title,
    tagline,
    language: params.language,
    domain: params.domain,
    complexity: params.complexity,
    estimatedHours: '35-50 hours',
    problemStatement: sketchPitch
      ? sketchPitch
      : `Modern software systems require high-reliability ${params.domain.toLowerCase()} infrastructure. This project challenges you to build the core engine from first principles in ${params.language}.`,
    coreArchitecture: `Multi-threaded asynchronous architecture leveraging ${params.language}'s native concurrency and standard library primitives, featuring memory-safe state isolation and structured logging.`,
    techStack: {
      language: params.language,
      protocols: ['TCP/IP', 'Binary Framing'],
      libraries: ['Standard Library', 'Telemetry', 'Async Runtime'],
    },
    architectureFlow: [
      'Client initiates connection over dedicated socket',
      'Zero-copy frame parser validates checksum and extracts payload',
      'Lock-free queue dispatches job to thread pool workers',
      'State machine commits transition and logs to append-only WAL',
      'Response frame dispatched with latency metrics attached',
    ],
    keyChallenges: [
      {
        title: 'Zero-Copy Buffer Management',
        description: 'Preventing memory fragmentation and excess heap allocations under heavy load.',
        solutionHint: 'Implement ring buffer pooling with byte slice slicing.',
      },
      {
        title: 'Deadlock-Free State Synchronization',
        description: 'Coordinating concurrent state machine mutations across multiple worker threads.',
        solutionHint: 'Utilize message-passing channels or fine-grained read-write locks.',
      },
    ],
    mvpPhases: [
      {
        phase: 'Phase 1',
        name: 'Core In-Memory Prototype',
        duration: '1-2 Weeks',
        goals: ['Protocol parsing', 'Basic state machine', 'Unit tests'],
        deliverables: ['Working single-process engine with test suite'],
      },
      {
        phase: 'Phase 2',
        name: 'Durability & Concurrency',
        duration: '2 Weeks',
        goals: ['Multi-threading', 'Disk persistence WAL', 'Graceful shutdown'],
        deliverables: ['Thread-safe engine with crash recovery'],
      },
      {
        phase: 'Phase 3',
        name: 'Benchmarking & Production Tooling',
        duration: '1-2 Weeks',
        goals: ['Load testing', 'Prometheus metrics', 'CLI tool'],
        deliverables: ['100k ops/sec verified benchmark suite and CLI client'],
      },
    ],
    learningOutcomes: [
      `Idiomatic concurrency and memory management in ${params.language}`,
      'Designing deterministic binary communication protocols',
      'Production crash-recovery and observability best practices',
    ],
    interviewTalkingPoints: [
      `Engineered high-throughput ${params.domain} architecture in ${params.language} with zero data loss under crash simulations`,
      'Optimized memory allocations achieving sub-millisecond p99 latency',
    ],
    tags: [params.language, params.domain, params.complexity, 'First Principles'],
    createdAt: new Date(now).toISOString().split('T')[0],
    isBookmarked: false,
  };
}

/** Merges sketch batches without duplicate titles (case-insensitive), up to maxCount. */
export function mergeSketches(existing: IdeaSketch[], incoming: IdeaSketch[], maxCount: number): IdeaSketch[] {
  const seen = new Set(existing.map((sketch) => sketch.title.toLowerCase()));
  const merged = [...existing];
  for (const sketch of incoming) {
    if (merged.length >= maxCount) break;
    const key = sketch.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(sketch);
  }
  return merged;
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
