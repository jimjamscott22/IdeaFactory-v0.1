// Server-side text generation behind one interface, so routes do not care whether
// Gemini or a local LM Studio server answers. Imported by server.ts only.
import { GoogleGenAI } from '@google/genai';

export type LlmProvider = 'gemini' | 'lmstudio';

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  system?: string;
  messages: LlmMessage[];
  /** Gemini-style response schema (uppercase `type` values). Requests JSON output. */
  schema?: Record<string, unknown>;
  schemaName?: string;
  temperature?: number;
}

export interface LlmResult {
  text: string;
  model: string;
}

export interface LlmStatus {
  provider: LlmProvider | 'demo';
  label: string;
  model?: string;
  reachable?: boolean;
  error?: string;
}

export interface LlmClient {
  provider: LlmProvider;
  generate(request: LlmRequest, requestedModel?: string): Promise<LlmResult>;
  status(): Promise<LlmStatus>;
}

type Env = Record<string, string | undefined>;
type FetchLike = typeof fetch;

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
export const DEFAULT_LMSTUDIO_BASE_URL = 'http://localhost:1234/v1';
const DEFAULT_LMSTUDIO_TIMEOUT_MS = 300_000; // local models can be slow

const VALID_GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.1-pro-preview',
];

export function getValidGeminiModel(requestedModel?: string): string {
  return requestedModel && VALID_GEMINI_MODELS.includes(requestedModel) ? requestedModel : DEFAULT_GEMINI_MODEL;
}

/** Which provider the environment asks for, or null for demo mode. Throws on an unknown name. */
export function resolveProvider(env: Env): LlmProvider | null {
  const explicit = env.LLM_PROVIDER?.trim().toLowerCase();
  if (explicit === 'lmstudio' || explicit === 'lm-studio') return 'lmstudio';
  if (explicit && explicit !== 'gemini') {
    throw new Error(`Unknown LLM_PROVIDER "${env.LLM_PROVIDER}". Use "gemini" or "lmstudio".`);
  }
  return env.GEMINI_API_KEY ? 'gemini' : null;
}

/** Gemini schemas use uppercase types (Type.OBJECT === 'OBJECT'); JSON Schema wants lowercase. */
export function toJsonSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toJsonSchema);
  if (schema && typeof schema === 'object') {
    return Object.fromEntries(
      Object.entries(schema).map(([key, value]) => [
        key,
        key === 'type' && typeof value === 'string' ? value.toLowerCase() : toJsonSchema(value),
      ])
    );
  }
  return schema;
}

/** Strips reasoning blocks and, for JSON output, code fences and chatter around the object. */
export function cleanModelText(text: string, expectJson: boolean): string {
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (!expectJson) return cleaned;

  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) cleaned = fenced[1].trim();
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    return start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  }
}

function createGeminiClient(apiKey: string): LlmClient {
  const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });

  return {
    provider: 'gemini',
    async generate(request, requestedModel) {
      const model = getValidGeminiModel(requestedModel);
      const response = await ai.models.generateContent({
        model,
        contents: request.messages.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
        config: {
          systemInstruction: request.system,
          ...(request.schema ? { responseMimeType: 'application/json', responseSchema: request.schema } : {}),
          ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
        },
      });
      return { text: response.text ?? '', model };
    },
    async status() {
      return { provider: 'gemini', label: 'Gemini 3.8 Flash' };
    },
  };
}

function createLmStudioClient(env: Env, fetchImpl: FetchLike): LlmClient {
  const baseUrl = (env.LMSTUDIO_BASE_URL?.trim() || DEFAULT_LMSTUDIO_BASE_URL).replace(/\/+$/, '');
  const configuredModel = env.LMSTUDIO_MODEL?.trim() || '';
  const timeoutMs = Number(env.LMSTUDIO_TIMEOUT_MS) > 0 ? Number(env.LMSTUDIO_TIMEOUT_MS) : DEFAULT_LMSTUDIO_TIMEOUT_MS;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (env.LMSTUDIO_API_KEY) headers.Authorization = `Bearer ${env.LMSTUDIO_API_KEY}`;

  const unreachable = () =>
    new Error(
      `Could not reach LM Studio at ${baseUrl}. Start the local server in LM Studio (Developer tab) or set LMSTUDIO_BASE_URL.`
    );

  const getJson = async (url: string): Promise<any> => {
    const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`LM Studio returned ${response.status} for ${url}`);
    return response.json();
  };

  // Prefer a model that is actually loaded (LM Studio's /api/v0 REST API), then fall back to
  // the first chat model the OpenAI-compatible /models route lists.
  const discoverModel = async (): Promise<string> => {
    try {
      const loaded = await getJson(`${new URL(baseUrl).origin}/api/v0/models`);
      const match = (loaded?.data ?? []).find(
        (m: any) => m?.state === 'loaded' && (m.type === 'llm' || m.type === 'vlm')
      );
      if (match?.id) return match.id;
    } catch {
      // The beta endpoint may be missing or disabled; try the standard one.
    }
    let listed: any;
    try {
      listed = await getJson(`${baseUrl}/models`);
    } catch (error) {
      if (error instanceof TypeError) throw unreachable();
      throw error;
    }
    const match = (listed?.data ?? []).find((m: any) => m?.id && !/embed/i.test(m.id));
    if (!match) throw new Error('No chat model is available in LM Studio. Load one, or set LMSTUDIO_MODEL.');
    return match.id;
  };

  const resolveModel = async () => configuredModel || discoverModel();

  const errorMessage = async (response: Response): Promise<string> => {
    const raw = await response.text();
    try {
      const parsed = JSON.parse(raw);
      const detail = parsed?.error?.message ?? parsed?.error ?? parsed?.message;
      if (typeof detail === 'string') return detail;
    } catch {
      // Not JSON; fall through to the raw body.
    }
    return raw.slice(0, 300) || response.statusText;
  };

  return {
    provider: 'lmstudio',
    async generate(request) {
      const model = await resolveModel();
      const body = {
        model,
        messages: [
          ...(request.system ? [{ role: 'system', content: request.system }] : []),
          ...request.messages,
        ],
        temperature: request.temperature ?? 0.7,
        stream: false,
        ...(request.schema
          ? {
              response_format: {
                type: 'json_schema',
                json_schema: { name: request.schemaName ?? 'response', strict: true, schema: toJsonSchema(request.schema) },
              },
            }
          : {}),
      };

      let response: Response;
      try {
        response = await fetchImpl(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'TimeoutError') {
          throw new Error(`LM Studio did not answer within ${Math.round(timeoutMs / 1000)}s. Try a smaller model or raise LMSTUDIO_TIMEOUT_MS.`);
        }
        throw unreachable();
      }

      if (!response.ok) {
        throw new Error(`LM Studio returned ${response.status}: ${await errorMessage(response)}`);
      }
      const data: any = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      const text = typeof content === 'string' ? cleanModelText(content, !!request.schema) : '';
      if (!text) throw new Error('LM Studio returned an empty response.');
      return { text, model: data?.model || model };
    },
    async status() {
      try {
        const model = await resolveModel();
        return { provider: 'lmstudio', label: `LM Studio · ${model}`, model, reachable: true };
      } catch (error) {
        return {
          provider: 'lmstudio',
          label: 'LM Studio · not ready',
          reachable: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

/** Builds the client the environment asks for; null means demo mode (canned responses). */
export function createLlmClient(env: Env = process.env, fetchImpl: FetchLike = fetch): LlmClient | null {
  const provider = resolveProvider(env);
  if (provider === 'lmstudio') return createLmStudioClient(env, fetchImpl);
  if (provider === 'gemini') return createGeminiClient(env.GEMINI_API_KEY as string);
  return null;
}
