import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { SEED_IDEAS } from './src/data/seedIdeas.ts';
import { IdeaItem } from './src/types/idea.ts';
import {
  CONCRETE_DOMAINS,
  CONCRETE_LANGUAGES,
  DEFAULT_SKETCH_MODEL,
  buildDemoExpandedIdea,
  buildDemoSketches,
  mergeSketches,
  normalizeGenerateIdeasRequest,
  parseSketches,
} from './src/lib/sketches.ts';
import type { ProjectGoal } from './src/types/idea.ts';
import { createLlmClient } from './src/lib/llm.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// In-memory repository seeded with initial high-caliber ideas
let repository: IdeaItem[] = [...SEED_IDEAS];

// LLM client (server-side only): Gemini or LM Studio per env, null means demo mode.
const llm = createLlmClient();
console.log(
  llm ? `LLM provider: ${llm.provider}` : 'LLM provider: none (demo mode, set GEMINI_API_KEY or LLM_PROVIDER=lmstudio)'
);

app.get('/api/llm-status', async (_req: Request, res: Response) => {
  res.json(llm ? await llm.status() : { provider: 'demo', label: 'Demo mode' });
});

// ----------------------------------------------------
// 1. API: Generate Idea using Gemini 3.8 Flash
// ----------------------------------------------------
app.post('/api/generate-idea', async (req: Request, res: Response) => {
  try {
    const {
      language = 'Rust',
      complexity = 'Advanced',
      domain = 'Distributed Systems',
      customPrompt = '',
      constraints = [],
      model = 'gemini-3.8-flash',
    } = req.body;

    if (!llm) {
      const fallbackIdea = buildDemoExpandedIdea({ language, complexity, domain, customPrompt });
      repository.unshift(fallbackIdea);
      return res.json({ idea: fallbackIdea, isMock: true });
    }

    const systemPrompt = `You are the lead engineering architect at IdeaFactory.
Your goal is to brainstorm a novel, authentic, deeply technical software development project idea.
CRITICAL QUALITY RULES:
1. Avoid generic beginner fluff (NO basic Todo apps, generic blog CMS, or simple weather wrappers).
2. The idea must be compelling, systems-level or architecturally ambitious, suitable for technical portfolio and deep learning.
3. Tailor specifically to the user's criteria:
   - Primary Language: ${language}
   - Complexity Level: ${complexity}
   - Technical Domain: ${domain}
   ${customPrompt ? `- User's Specific Vision / Focus: ${customPrompt}` : ''}
   ${constraints?.length ? `- Constraints & Requirements: ${constraints.join(', ')}` : ''}

You must return a strictly valid JSON object matching the requested schema.`;

    const userPrompt = `Generate a comprehensive technical project specification for:
Language: ${language}
Complexity: ${complexity}
Domain: ${domain}
Focus: ${customPrompt || 'Novel, ambitious real-world project'}`;

    const response = await llm.generate(
      {
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        schemaName: 'project_specification',
        schema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Catchy, realistic project name and subtitle' },
            tagline: { type: Type.STRING, description: 'One-sentence compelling technical elevator pitch' },
            estimatedHours: { type: Type.STRING, description: 'Realistic engineering time estimate, e.g. 35-50 hours' },
            problemStatement: { type: Type.STRING, description: 'Concrete real-world pain point or computer science challenge' },
            coreArchitecture: { type: Type.STRING, description: 'Detailed high-level architectural design description' },
            techStack: {
              type: Type.OBJECT,
              properties: {
                language: { type: Type.STRING },
                framework: { type: Type.STRING },
                database: { type: Type.STRING },
                protocols: { type: Type.ARRAY, items: { type: Type.STRING } },
                libraries: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['language', 'protocols', 'libraries'],
            },
            architectureFlow: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Step-by-step 4-6 component lifecycle flow',
            },
            keyChallenges: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  solutionHint: { type: Type.STRING },
                },
                required: ['title', 'description', 'solutionHint'],
              },
            },
            mvpPhases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  phase: { type: Type.STRING },
                  name: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  goals: { type: Type.ARRAY, items: { type: Type.STRING } },
                  deliverables: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['phase', 'name', 'duration', 'goals', 'deliverables'],
              },
            },
            learningOutcomes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            interviewTalkingPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            'title',
            'tagline',
            'estimatedHours',
            'problemStatement',
            'coreArchitecture',
            'techStack',
            'architectureFlow',
            'keyChallenges',
            'mvpPhases',
            'learningOutcomes',
            'interviewTalkingPoints',
            'tags',
          ],
        },
      },
      model
    );

    const parsed = JSON.parse(response.text || '{}');
    const newIdea: IdeaItem = {
      id: `idea-${Date.now()}`,
      title: parsed.title || `${language} ${domain} System`,
      tagline: parsed.tagline || '',
      language,
      domain,
      complexity,
      estimatedHours: parsed.estimatedHours || '40 hours',
      problemStatement: parsed.problemStatement || '',
      coreArchitecture: parsed.coreArchitecture || '',
      techStack: parsed.techStack || { language, protocols: [], libraries: [] },
      architectureFlow: parsed.architectureFlow || [],
      keyChallenges: parsed.keyChallenges || [],
      mvpPhases: parsed.mvpPhases || [],
      learningOutcomes: parsed.learningOutcomes || [],
      interviewTalkingPoints: parsed.interviewTalkingPoints || [],
      tags: parsed.tags || [language, domain],
      createdAt: new Date().toISOString().split('T')[0],
      isBookmarked: false,
    };

    // Auto-persist in current session
    repository.unshift(newIdea);

    res.json({ idea: newIdea, model: response.model });
  } catch (error: any) {
    console.error('Error generating idea:', error);
    res.status(500).json({ error: error.message || 'Failed to generate idea' });
  }
});

// ----------------------------------------------------
// 1b. API: Quick Idea Sketches (batch of short ideas)
// ----------------------------------------------------
const GOAL_GUIDANCE: Record<ProjectGoal, string> = {
  Learning: 'favor ideas that teach a core concept and can be built incrementally.',
  Portfolio: 'favor ideas with a visible, demo-able result that impresses reviewers.',
  'Interview Prep': 'favor ideas that exercise classic system-design and data-structure trade-offs.',
  'Real-World Tool': 'favor ideas that solve a genuine everyday problem the builder would actually use.',
};

const SKETCH_ANGLES = [
  'an unusual data source',
  'a gap in developer tooling',
  'performance-critical internals',
  'a teaching or visualization tool',
  'offline-first or local-first design',
  'something playful or fun to demo',
  'reliability under failure',
];

app.post('/api/generate-ideas', async (req: Request, res: Response) => {
  try {
    const ideasReq = normalizeGenerateIdeasRequest(req.body);

    if (!llm) {
      return res.json({ sketches: buildDemoSketches(ideasReq), isMock: true });
    }

    const languageRule =
      ideasReq.language === 'Any Language'
        ? `choose a fitting language per idea and vary them across the batch. Use one of: ${CONCRETE_LANGUAGES.join(', ')}`
        : ideasReq.language;
    const domainRule =
      ideasReq.domain === 'Any Domain'
        ? `spread ideas across different domains. Use one of: ${CONCRETE_DOMAINS.join(', ')}`
        : ideasReq.domain;

    const sketchSchema = {
      type: Type.OBJECT,
      properties: {
        ideas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Short, catchy project name' },
              pitch: { type: Type.STRING, description: 'One or two sentence elevator pitch' },
              whyItFits: { type: Type.STRING, description: "One sentence on why it suits the builder's goal" },
              estimatedHours: { type: Type.STRING, description: 'Realistic time estimate, e.g. 15-25 hours' },
              tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: '2-5 short tags' },
              language: { type: Type.STRING, description: 'Primary programming language' },
              domain: { type: Type.STRING, description: 'Technical domain' },
            },
            required: ['title', 'pitch', 'whyItFits', 'estimatedHours', 'tags', 'language', 'domain'],
          },
        },
      },
      required: ['ideas'],
    };

    const MAX_SKETCH_ATTEMPTS = 3;
    let sketches: ReturnType<typeof parseSketches> = [];
    let avoidTitles = [...ideasReq.avoidTitles];
    let responseModel = ideasReq.model ?? DEFAULT_SKETCH_MODEL;

    for (let attempt = 0; attempt < MAX_SKETCH_ATTEMPTS && sketches.length < ideasReq.count; attempt++) {
      const angle = SKETCH_ANGLES[Math.floor(Math.random() * SKETCH_ANGLES.length)];
      const stillNeeded = ideasReq.count - sketches.length;

      const systemPrompt = `You are the lead engineering architect at IdeaFactory, pitching short software project ideas.
RULES:
1. Avoid generic beginner fluff (NO basic todo apps, generic blog CMS, or simple weather wrappers).
2. Every idea in the batch must be a genuinely different problem, not a rename of another.
3. Size each idea for this complexity level: ${ideasReq.complexity}.
4. Builder's goal: ${ideasReq.goal} — ${GOAL_GUIDANCE[ideasReq.goal]}
5. Language: ${languageRule}.
6. Domain: ${domainRule}.
7. Creative angle for this batch: ${angle}.
${avoidTitles.length ? `8. Do not repeat or lightly rephrase these previous ideas: ${avoidTitles.join('; ')}` : ''}

Return a strictly valid JSON object matching the requested schema.`;

      const response = await llm.generate(
        {
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `Pitch exactly ${stillNeeded} distinct project ideas.`,
            },
          ],
          schemaName: 'idea_sketches',
          schema: sketchSchema,
        },
        ideasReq.model ?? DEFAULT_SKETCH_MODEL
      );
      responseModel = response.model;

      let parsed: unknown = {};
      try {
        parsed = JSON.parse(response.text || '{}');
      } catch {
        parsed = {};
      }

      const batch = parseSketches(parsed, { ...ideasReq, avoidTitles }, Date.now() + attempt);
      sketches = mergeSketches(sketches, batch, ideasReq.count);
      avoidTitles = [...ideasReq.avoidTitles, ...sketches.map((sketch) => sketch.title)];
    }

    if (sketches.length === 0) {
      return res.status(502).json({ error: 'Model returned no usable ideas' });
    }
    if (sketches.length < ideasReq.count) {
      return res.status(502).json({
        error: `Model returned only ${sketches.length} of ${ideasReq.count} usable ideas`,
      });
    }

    res.json({ sketches, model: responseModel });
  } catch (error: any) {
    console.error('Error generating idea sketches:', error);
    res.status(500).json({ error: error.message || 'Failed to generate ideas' });
  }
});

// ----------------------------------------------------
// 2. API: Refine Idea (Deep Dive Technical Breakdown)
// ----------------------------------------------------
app.post('/api/refine-idea', async (req: Request, res: Response) => {
  try {
    const {
      idea,
      refinementType = 'architecture_flow',
      customQuestion = '',
      model = 'gemini-3.8-flash',
    } = req.body;

    if (!llm) {
      return res.json({
        content: `### Refinement Specification: ${idea?.title}\n\n*Note: Running in offline simulation mode.*\n\n**Key Architecture Highlight:**\n- Primary language: ${idea?.language}\n- Target Domain: ${idea?.domain}\n\n1. Establish robust zero-copy memory buffers.\n2. Implement crash recovery with strict checksum validation.\n3. Validate concurrency limits under simulated network jitter.`,
      });
    }

    let refinementPrompt = '';
    switch (refinementType) {
      case 'sql_schema':
        refinementPrompt = `Provide a complete, production-ready PostgreSQL relational schema (DDL) for storing, indexing, and querying data for this project: "${idea.title}". Include tables, primary keys, foreign keys, JSONB columns where appropriate, B-tree/GIN indexes, constraints, and audit timestamps. Provide SQL code blocks with explanations.`;
        break;
      case 'pitfalls_edge_cases':
        refinementPrompt = `Conduct a rigorous Staff-Engineer level failure mode analysis for "${idea.title}". Identify 5 subtle, insidious production failure modes (e.g. race conditions, memory leaks, split-brain, file descriptor leaks, thundering herd, cascading timeouts) and provide the exact mitigation strategy for each in ${idea.language}.`;
        break;
      case 'starter_code':
        refinementPrompt = `Write the foundational starter code implementation in ${idea.language} for "${idea.title}". Include the primary data structures, core interfaces/traits, a clean initialization function, and error handling. Make the code authentic, idiomatic, and ready to compile. Also provide a minimal Dockerfile or build configuration.`;
        break;
      case 'implementation_roadmap':
        refinementPrompt = `Create a day-by-day 3-week engineering roadmap for building "${idea.title}". Break it down into Day 1-5, Day 6-10, Day 11-15, and Day 16-21. For each milestone, provide concrete acceptance criteria, test commands (e.g. cargo test, go test, pytest), and benchmark thresholds.`;
        break;
      case 'interview_defense':
        refinementPrompt = `Generate a technical interview preparation guide for presenting "${idea.title}" on a resume. Include: 1) The 30-second elevator pitch, 2) 4 deep architectural questions a Senior/Staff interviewer will ask and the ideal high-scoring answers, 3) Metrics to boast about (e.g., latency, throughput, memory overhead).`;
        break;
      default:
        refinementPrompt = `Provide a comprehensive technical architecture blueprint for "${idea.title}" in ${idea.language}. Detail component communication, data serialization, concurrency patterns, and storage mechanisms.`;
    }

    if (customQuestion) {
      refinementPrompt += `\n\nAdditionally, specifically address this user inquiry: "${customQuestion}"`;
    }

    const systemInstruction = `You are a Principal Software Architect at IdeaFactory specializing in ${idea.language} and ${idea.domain}.
Provide deeply technical, concrete, actionable engineering guidance. Use clean Markdown, well-commented code blocks, and precise terminology. Do not speak down to the engineer.`;

    const response = await llm.generate(
      { system: systemInstruction, messages: [{ role: 'user', content: refinementPrompt }], temperature: 0.7 },
      model
    );

    res.json({ content: response.text, model: response.model });
  } catch (error: any) {
    console.error('Error refining idea:', error);
    res.status(500).json({ error: error.message || 'Failed to refine idea' });
  }
});

// ----------------------------------------------------
// 3. API: Multi-turn Chat using Gemini 3.8 Flash
// ----------------------------------------------------
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const {
      messages = [],
      role = 'system_architect',
      currentIdeaContext = null,
      model = 'gemini-3.8-flash',
    } = req.body;

    if (!llm) {
      return res.json({
        reply: `Hello! I am your IdeaFactory Architect assistant. (Running in local simulation mode). You asked about: "${messages[messages.length - 1]?.content || 'software architecture'}". To get real-time AI responses, configure GEMINI_API_KEY (or LLM_PROVIDER=lmstudio) in the environment.`,
      });
    }

    let roleInstruction = '';
    switch (role) {
      case 'system_architect':
        roleInstruction =
          'You are a Distinguished Systems Architect at IdeaFactory. You specialize in distributed consensus, low-level OS kernels, memory hierarchies, high-throughput network protocols, and trade-off analysis. You challenge naive designs and recommend bulletproof distributed patterns.';
        break;
      case 'principal_engineer':
        roleInstruction =
          'You are a Pragmatic Principal Software Engineer. You write clean, high-performance code in Rust, Go, Python, C++, Zig, and TypeScript. You focus on ergonomics, zero-allocation fast paths, correct error handling, and testability.';
        break;
      case 'code_reviewer':
        roleInstruction =
          'You are a Thorough Senior Code Reviewer. You meticulously spot race conditions, goroutine/memory leaks, unhandled edge cases, missing lock acquisitions, security vulnerabilities, and cache invalidation traps.';
        break;
      case 'interview_coach':
        roleInstruction =
          'You are a Tier-1 Tech Lead & Systems Engineering Interviewer. You evaluate projects based on engineering depth, trade-off articulation, failure mode awareness, and real-world applicability.';
        break;
      default:
        roleInstruction = 'You are an expert software engineering co-founder and mentor.';
    }

    if (currentIdeaContext) {
      roleInstruction += `\n\nACTIVE PROJECT CONTEXT:
The user is currently examining the following project idea:
Title: ${currentIdeaContext.title}
Language: ${currentIdeaContext.language}
Complexity: ${currentIdeaContext.complexity}
Domain: ${currentIdeaContext.domain}
Summary: ${currentIdeaContext.tagline}
Core Architecture: ${currentIdeaContext.coreArchitecture}
Always keep your answers grounded in this project's domain and language unless the user asks to switch.`;
    }

    // Client history uses 'model' for assistant turns
    const history = messages.map((m: any) => ({
      role: m.role === 'model' ? ('assistant' as const) : ('user' as const),
      content: String(m.content ?? ''),
    }));

    const response = await llm.generate({ system: roleInstruction, messages: history }, model);

    res.json({ reply: response.text, model: response.model });
  } catch (error: any) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: error.message || 'Chat service encountered an error' });
  }
});

// ----------------------------------------------------
// 4. API: Repository CRUD
// ----------------------------------------------------
app.get('/api/ideas', (_req: Request, res: Response) => {
  res.json({ ideas: repository, total: repository.length });
});

app.post('/api/ideas', (req: Request, res: Response) => {
  const newIdea = req.body;
  if (!newIdea.id) newIdea.id = `idea-${Date.now()}`;
  if (!newIdea.createdAt) newIdea.createdAt = new Date().toISOString().split('T')[0];
  repository.unshift(newIdea);
  res.status(201).json({ idea: newIdea, success: true });
});

app.put('/api/ideas/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = repository.findIndex((item) => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Idea not found' });
  }
  repository[index] = { ...repository[index], ...req.body };
  res.json({ idea: repository[index], success: true });
});

app.delete('/api/ideas/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  repository = repository.filter((item) => item.id !== id);
  res.json({ success: true, remaining: repository.length });
});

// ----------------------------------------------------
// 5. API: Model Context Protocol (MCP) Simulator
// ----------------------------------------------------
app.post('/api/mcp-invoke', (req: Request, res: Response) => {
  const { tool, params } = req.body;

  switch (tool) {
    case 'list_ideas': {
      const limit = params?.limit || 10;
      const results = repository.slice(0, limit).map((i) => ({
        id: i.id,
        title: i.title,
        language: i.language,
        domain: i.domain,
        complexity: i.complexity,
      }));
      return res.json({
        tool,
        status: 'success',
        result: { count: results.length, ideas: results },
      });
    }

    case 'search_by_stack': {
      const lang = (params?.language || '').toLowerCase();
      const domain = (params?.domain || '').toLowerCase();
      const matches = repository.filter((i) => {
        const matchLang = !lang || i.language.toLowerCase().includes(lang);
        const matchDomain = !domain || i.domain.toLowerCase().includes(domain);
        return matchLang && matchDomain;
      });
      return res.json({
        tool,
        status: 'success',
        result: { count: matches.length, matches },
      });
    }

    case 'check_duplicates': {
      const title = (params?.title || '').toLowerCase();
      const duplicate = repository.find((i) => i.title.toLowerCase().includes(title));
      return res.json({
        tool,
        status: 'success',
        result: {
          hasDuplicate: !!duplicate,
          similarIdea: duplicate ? { id: duplicate.id, title: duplicate.title } : null,
        },
      });
    }

    case 'get_idea_by_id': {
      const match = repository.find((i) => i.id === params?.id);
      if (!match) {
        return res.status(404).json({ tool, status: 'error', error: 'Idea not found' });
      }
      return res.json({ tool, status: 'success', result: match });
    }

    default:
      return res.status(400).json({ tool, status: 'error', error: `Unknown tool: ${tool}` });
  }
});

// ----------------------------------------------------
// 6. API: Simulated PostgreSQL Relational Query Runner
// ----------------------------------------------------
app.post('/api/simulate-sql', (req: Request, res: Response) => {
  const { query = '' } = req.body;
  const q = query.trim().toLowerCase();

  if (q.includes('select') && q.includes('from ideas')) {
    const rows = repository.slice(0, 10).map((item, idx) => ({
      id: idx + 1,
      uuid: item.id,
      title: item.title,
      language: item.language,
      domain: item.domain,
      complexity: item.complexity,
      created_at: item.createdAt,
    }));
    return res.json({
      rows,
      rowCount: rows.length,
      fields: ['id', 'uuid', 'title', 'language', 'domain', 'complexity', 'created_at'],
      executionTimeMs: 1.4,
    });
  }

  if (q.includes('select') && q.includes('count')) {
    return res.json({
      rows: [{ count: repository.length }],
      rowCount: 1,
      fields: ['count'],
      executionTimeMs: 0.8,
    });
  }

  if (q.includes('select') && q.includes('from tags')) {
    const allTags = Array.from(new Set(repository.flatMap((i) => i.tags)));
    const rows = allTags.map((tag, idx) => ({ id: idx + 1, name: tag, usage_count: Math.floor(Math.random() * 8) + 1 }));
    return res.json({
      rows,
      rowCount: rows.length,
      fields: ['id', 'name', 'usage_count'],
      executionTimeMs: 1.1,
    });
  }

  return res.json({
    rows: repository.slice(0, 5).map((i) => ({ title: i.title, language: i.language, complexity: i.complexity })),
    rowCount: 5,
    fields: ['title', 'language', 'complexity'],
    executionTimeMs: 1.2,
  });
});

// ----------------------------------------------------
// Setup Vite in Dev or Static Serving in Prod
// ----------------------------------------------------
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: Number(PORT),
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`IdeaFactory server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
