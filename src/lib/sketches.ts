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
