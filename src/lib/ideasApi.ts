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
      sourceTitle: source.title,
      sourcePitch: source.pitch,
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
