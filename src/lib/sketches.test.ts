import { describe, expect, it } from 'vitest';
import type { GenerateIdeasRequest, IdeaSketch } from '../types/idea';
import {
  DEFAULT_IDEAS_REQUEST,
  buildExpandPrompt,
  normalizeGenerateIdeasRequest,
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
