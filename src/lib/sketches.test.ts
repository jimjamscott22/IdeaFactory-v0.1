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
