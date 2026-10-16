import { describe, expect, it } from 'vitest';
import type { GenerateIdeasRequest, IdeaSketch } from '../types/idea';
import { DEMO_SKETCH_POOL } from '../data/demoSketches';
import {
  CONCRETE_DOMAINS,
  DEFAULT_IDEAS_REQUEST,
  buildDemoExpandedIdea,
  buildDemoSketches,
  buildExpandPrompt,
  mergeSketches,
  normalizeGenerateIdeasRequest,
  parseExpandPrompt,
  parseSketches,
  sketchToDraftIdea,
} from './sketches';

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

describe('parseExpandPrompt', () => {
  it('extracts title and pitch from an expand prompt', () => {
    const prompt = buildExpandPrompt(sampleSketch);
    expect(parseExpandPrompt(prompt)).toEqual({ title: 'Tiny KV', pitch: 'A tiny key-value store.' });
  });

  it('returns empty fields for unrelated text', () => {
    expect(parseExpandPrompt('Generate something cool')).toEqual({ title: undefined, pitch: undefined });
  });
});

describe('buildDemoExpandedIdea', () => {
  it('keeps sketch title and pitch when expanding in demo mode', () => {
    const idea = buildDemoExpandedIdea({
      language: 'Go',
      complexity: 'Advanced',
      domain: 'Database Engines',
      customPrompt: buildExpandPrompt(sampleSketch),
    });
    expect(idea.title).toBe('Tiny KV');
    expect(idea.tagline).toBe('A tiny key-value store.');
    expect(idea.problemStatement).toBe('A tiny key-value store.');
  });

  it('falls back to generic naming without an expand prompt', () => {
    const idea = buildDemoExpandedIdea({ language: 'Rust', complexity: 'Advanced', domain: 'Distributed Systems' });
    expect(idea.title).toBe('Rust Distributed Systems Core Engine');
  });
});

describe('mergeSketches', () => {
  it('dedupes by title and respects the max count', () => {
    const a = { ...sampleSketch, id: 'a', title: 'One' };
    const b = { ...sampleSketch, id: 'b', title: 'one' };
    const c = { ...sampleSketch, id: 'c', title: 'Two' };
    expect(mergeSketches([a], [b, c], 3)).toEqual([a, c]);
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
