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

export function normalizeImportedIdea(raw: any, index: number): IdeaItem {
  const isDraft = Boolean(
    raw.isDraft ||
      (!raw.problemStatement && (!Array.isArray(raw.mvpPhases) || raw.mvpPhases.length === 0))
  );

  const title = String(raw.title || `Imported Concept ${index + 1}`).trim();
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `idea-imported-${Date.now()}-${index}`;
  const language = raw.language || 'Rust';
  const domain = raw.domain || 'CLI & DevTools';
  const complexity = raw.complexity || 'Intermediate';

  return {
    id,
    title,
    tagline: typeof raw.tagline === 'string' && raw.tagline.trim() ? raw.tagline.trim() : title,
    language,
    domain,
    complexity,
    estimatedHours: typeof raw.estimatedHours === 'string' && raw.estimatedHours.trim() ? raw.estimatedHours.trim() : '25-40 hours',
    problemStatement: typeof raw.problemStatement === 'string' && raw.problemStatement.trim() ? raw.problemStatement.trim() : title,
    coreArchitecture: typeof raw.coreArchitecture === 'string' && raw.coreArchitecture.trim() ? raw.coreArchitecture.trim() : 'Architecture breakdown in progress.',
    techStack: {
      language: raw.techStack?.language || language,
      framework: raw.techStack?.framework,
      database: raw.techStack?.database,
      protocols: Array.isArray(raw.techStack?.protocols) ? raw.techStack.protocols : ['HTTP/REST'],
      libraries: Array.isArray(raw.techStack?.libraries) ? raw.techStack.libraries : [],
    },
    architectureFlow: Array.isArray(raw.architectureFlow) ? raw.architectureFlow : [],
    keyChallenges: Array.isArray(raw.keyChallenges)
      ? raw.keyChallenges.map((c: any) => ({
          title: String(c?.title || 'System Challenge'),
          description: String(c?.description || ''),
          solutionHint: String(c?.solutionHint || ''),
        }))
      : [],
    mvpPhases: Array.isArray(raw.mvpPhases)
      ? raw.mvpPhases.map((p: any) => ({
          phase: String(p?.phase || 'Phase 1'),
          name: String(p?.name || 'Milestone'),
          duration: String(p?.duration || '1-2 weeks'),
          goals: Array.isArray(p?.goals) ? p.goals : [],
          deliverables: Array.isArray(p?.deliverables) ? p.deliverables : [],
        }))
      : [],
    learningOutcomes: Array.isArray(raw.learningOutcomes) ? raw.learningOutcomes : [],
    interviewTalkingPoints: Array.isArray(raw.interviewTalkingPoints) ? raw.interviewTalkingPoints : [],
    tags: Array.isArray(raw.tags) ? raw.tags : [language, domain],
    isBookmarked: Boolean(raw.isBookmarked),
    isDraft,
    goal: raw.goal,
    createdAt: typeof raw.createdAt === 'string' && raw.createdAt.trim() ? raw.createdAt : new Date().toISOString().split('T')[0],
    codeSnippet: raw.codeSnippet,
    sqlSchema: raw.sqlSchema,
    dockerCompose: raw.dockerCompose,
  };
}

export function validateAndParseCatalogJson(
  rawJson: string,
  existingIdeas: IdeaItem[] = []
): import('../types/idea').CatalogValidationSummary {
  const errors: string[] = [];
  let parsedRaw: any;

  try {
    parsedRaw = JSON.parse(rawJson);
  } catch (err: any) {
    return {
      isValid: false,
      errors: [`JSON parse error: ${err.message || 'Malformed JSON syntax'}`],
      parsedIdeas: [],
      fullSpecsCount: 0,
      draftsCount: 0,
      languages: [],
      duplicateCount: 0,
    };
  }

  let rawList: any[] = [];
  if (Array.isArray(parsedRaw)) {
    rawList = parsedRaw;
  } else if (parsedRaw && typeof parsedRaw === 'object' && Array.isArray(parsedRaw.ideas)) {
    rawList = parsedRaw.ideas;
  } else {
    return {
      isValid: false,
      errors: ['File content must be a JSON array of ideas or an object with an "ideas" array.'],
      parsedIdeas: [],
      fullSpecsCount: 0,
      draftsCount: 0,
      languages: [],
      duplicateCount: 0,
    };
  }

  if (rawList.length === 0) {
    return {
      isValid: false,
      errors: ['The selected file contains 0 ideas.'],
      parsedIdeas: [],
      fullSpecsCount: 0,
      draftsCount: 0,
      languages: [],
      duplicateCount: 0,
    };
  }

  const existingIds = new Set(existingIdeas.map((i) => i.id.toLowerCase()));
  const existingTitles = new Set(existingIdeas.map((i) => i.title.trim().toLowerCase()));

  const parsedIdeas: IdeaItem[] = [];
  let fullSpecsCount = 0;
  let draftsCount = 0;
  let duplicateCount = 0;
  const langSet = new Set<string>();

  rawList.forEach((item, idx) => {
    if (!item || typeof item !== 'object') {
      errors.push(`Item #${idx + 1} is not a valid JSON object.`);
      return;
    }
    if (!item.title || typeof item.title !== 'string' || !item.title.trim()) {
      errors.push(`Item #${idx + 1} is missing a required "title" property.`);
      return;
    }

    const normalized = normalizeImportedIdea(item, idx);
    parsedIdeas.push(normalized);

    if (normalized.isDraft) {
      draftsCount += 1;
    } else {
      fullSpecsCount += 1;
    }

    if (normalized.language) {
      langSet.add(normalized.language);
    }

    const matchesId = normalized.id && existingIds.has(normalized.id.toLowerCase());
    const matchesTitle = existingTitles.has(normalized.title.toLowerCase());
    if (matchesId || matchesTitle) {
      duplicateCount += 1;
    }
  });

  return {
    isValid: errors.length === 0 && parsedIdeas.length > 0,
    errors,
    parsedIdeas,
    fullSpecsCount,
    draftsCount,
    languages: Array.from(langSet),
    duplicateCount,
  };
}

export async function importCatalog(
  payload: import('../types/idea').CatalogImportPayload
): Promise<import('../types/idea').CatalogImportResult> {
  const res = await fetch('/api/ideas/import', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Catalog restore failed (${res.status})`));
  }
  return res.json();
}

