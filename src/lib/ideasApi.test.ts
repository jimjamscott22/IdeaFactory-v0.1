import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  expandToSpec,
  importCatalog,
  requestIdeas,
  saveDraft,
  validateAndParseCatalogJson,
} from './ideasApi';
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
      sourceTitle: 'Tiny KV',
      sourcePitch: 'A tiny key-value store.',
      customPrompt: buildExpandPrompt(source),
      constraints: [],
      model: 'gemini-3.8-flash',
    });
  });

  it('throws when the response has no idea', async () => {
    mockFetch(json(200, {}));
    await expect(expandToSpec(source, 'gemini-3.8-flash')).rejects.toThrow('No specification was returned');
  });

  it('persists the demo-mode expanded idea in the server repository and keeps sketch title/pitch', async () => {
    vi.unstubAllGlobals();
    const { app } = await import('../../server');
    const server = app.listen(0);
    try {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      const base = `http://127.0.0.1:${port}`;

      const genRes = await fetch(`${base}/api/generate-idea`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: source.language,
          complexity: source.complexity,
          domain: source.domain,
          sourceTitle: source.title,
          sourcePitch: source.pitch,
          customPrompt: buildExpandPrompt(source),
        }),
      });
      expect(genRes.status).toBe(200);
      const genData = await genRes.json();
      expect(genData.isMock).toBe(true);
      expect(genData.idea.title).toBe('Tiny KV');
      expect(genData.idea.tagline).toBe('A tiny key-value store.');

      const listRes = await fetch(`${base}/api/ideas`);
      const listData = await listRes.json();
      expect(listData.ideas.some((item: IdeaItem) => item.id === genData.idea.id && item.title === 'Tiny KV')).toBe(
        true
      );
    } finally {
      server.close();
    }
  });
});

describe('validateAndParseCatalogJson', () => {
  it('rejects malformed JSON', () => {
    const res = validateAndParseCatalogJson('not a json string');
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toContain('JSON parse error');
  });

  it('rejects non-array non-ideas-object payloads', () => {
    const res = validateAndParseCatalogJson(JSON.stringify({ someField: 123 }));
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toContain('JSON array of ideas');
  });

  it('rejects an empty array', () => {
    const res = validateAndParseCatalogJson('[]');
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toContain('0 ideas');
  });

  it('rejects items missing titles', () => {
    const res = validateAndParseCatalogJson(JSON.stringify([{ language: 'Rust' }]));
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toContain('missing a required "title" property');
  });

  it('validates and normalizes valid full specs and drafts', () => {
    const sample = [
      {
        id: 'idea-custom-1',
        title: 'Distributed Log Engine',
        language: 'Rust',
        domain: 'Distributed Systems',
        complexity: 'Advanced',
        problemStatement: 'Solving distributed consensus.',
        mvpPhases: [{ phase: '1', name: 'WAL', duration: '1w', goals: [], deliverables: [] }],
      },
      {
        id: 'draft-custom-2',
        title: 'Git Submodule Explorer',
        language: 'Go',
        domain: 'CLI & DevTools',
        isDraft: true,
      },
    ];

    const existing = [
      { id: 'idea-custom-1', title: 'Distributed Log Engine' } as IdeaItem,
    ];

    const res = validateAndParseCatalogJson(JSON.stringify(sample), existing);
    expect(res.isValid).toBe(true);
    expect(res.parsedIdeas.length).toBe(2);
    expect(res.fullSpecsCount).toBe(1);
    expect(res.draftsCount).toBe(1);
    expect(res.languages).toContain('Rust');
    expect(res.languages).toContain('Go');
    expect(res.duplicateCount).toBe(1);
    expect(res.parsedIdeas[0].id).toBe('idea-custom-1');
    expect(res.parsedIdeas[1].isDraft).toBe(true);
  });
});

describe('importCatalog', () => {
  it('posts payload to /api/ideas/import and returns response', async () => {
    const mockResult = {
      success: true,
      mode: 'merge' as const,
      importedCount: 1,
      addedCount: 1,
      updatedCount: 0,
      totalCatalogCount: 10,
      ideas: [{ id: 'test-1', title: 'Test' } as IdeaItem],
    };

    const fn = mockFetch(json(200, mockResult));
    const result = await importCatalog({
      mode: 'merge',
      ideas: [{ title: 'Test', language: 'Rust' }],
    });

    expect(fn.mock.calls[0][0]).toBe('/api/ideas/import');
    expect(sentBody(fn)).toEqual({
      mode: 'merge',
      ideas: [{ title: 'Test', language: 'Rust' }],
    });
    expect(result).toEqual(mockResult);
  });

  it('throws on server import failure', async () => {
    mockFetch(json(400, { error: 'No ideas provided for import.' }));
    await expect(
      importCatalog({ mode: 'merge', ideas: [] })
    ).rejects.toThrow('No ideas provided for import.');
  });
});

