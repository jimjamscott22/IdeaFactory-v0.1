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
