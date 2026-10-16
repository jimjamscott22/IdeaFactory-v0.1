import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanModelText, createLlmClient, getValidGeminiModel, redactUrl, resolveProvider, toJsonSchema } from './llm';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const completion = (content: string, model = 'qwen-test') => json(200, { model, choices: [{ message: { content } }] });

// Body of the chat/completions request among the mock's calls.
const chatBody = (fn: { mock: { calls: unknown[][] } }) => {
  const call = fn.mock.calls.find(([url]) => String(url).endsWith('/chat/completions'))!;
  return JSON.parse((call[1] as RequestInit).body as string);
};

const lmEnv = { LLM_PROVIDER: 'lmstudio', LMSTUDIO_MODEL: 'qwen-test' };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resolveProvider', () => {
  it('uses Gemini when only a key is set', () => {
    expect(resolveProvider({ GEMINI_API_KEY: 'k' })).toBe('gemini');
  });

  it('returns null (demo mode) with no key and no provider', () => {
    expect(resolveProvider({})).toBeNull();
    expect(resolveProvider({ GEMINI_API_KEY: '' })).toBeNull();
  });

  it('lets LM Studio win over a configured Gemini key', () => {
    expect(resolveProvider({ LLM_PROVIDER: 'LMStudio', GEMINI_API_KEY: 'k' })).toBe('lmstudio');
    expect(resolveProvider({ LLM_PROVIDER: 'lm-studio' })).toBe('lmstudio');
  });

  it('treats explicit gemini without a key as demo mode', () => {
    expect(resolveProvider({ LLM_PROVIDER: 'gemini' })).toBeNull();
  });

  it('rejects an unknown provider', () => {
    expect(() => resolveProvider({ LLM_PROVIDER: 'ollama' })).toThrow('Unknown LLM_PROVIDER "ollama"');
  });
});

describe('createLlmClient', () => {
  it('returns null in demo mode', () => {
    expect(createLlmClient({})).toBeNull();
  });
});

describe('getValidGeminiModel', () => {
  it('keeps known models and falls back otherwise', () => {
    expect(getValidGeminiModel('gemini-3.5-flash')).toBe('gemini-3.5-flash');
    expect(getValidGeminiModel('qwen-test')).toBe('gemini-3.8-flash');
    expect(getValidGeminiModel()).toBe('gemini-3.8-flash');
  });
});

describe('redactUrl', () => {
  it('removes credentials and query strings', () => {
    expect(redactUrl('http://user:pw@box:1234/v1/?token=x')).toBe('http://box:1234/v1');
    expect(redactUrl('not a url')).toBe('(invalid LMSTUDIO_BASE_URL)');
  });
});

describe('toJsonSchema', () => {
  it('lowercases type values but leaves property names alone', () => {
    const converted = toJsonSchema({
      type: 'OBJECT',
      properties: { type: { type: 'STRING' }, list: { type: 'ARRAY', items: { type: 'STRING' } } },
      required: ['type'],
    });
    expect(converted).toEqual({
      type: 'object',
      properties: { type: { type: 'string' }, list: { type: 'array', items: { type: 'string' } } },
      required: ['type'],
    });
  });
});

describe('cleanModelText', () => {
  it('removes reasoning blocks', () => {
    expect(cleanModelText('<think>hmm\nlet me see</think>\nHello', false)).toBe('Hello');
  });

  it('unwraps fenced JSON', () => {
    expect(cleanModelText('```json\n{"a":1}\n```', true)).toBe('{"a":1}');
  });

  it('cuts chatter around a JSON object', () => {
    expect(cleanModelText('Sure! Here you go: {"a":1} Hope that helps.', true)).toBe('{"a":1}');
  });

  it('leaves plain text untouched when JSON is not expected', () => {
    expect(cleanModelText('use {braces} freely', false)).toBe('use {braces} freely');
  });
});

describe('LM Studio client', () => {
  it('posts an OpenAI chat request with a JSON schema and returns the content', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completion('{"ok":true}'));
    const client = createLlmClient(lmEnv, fetchMock)!;
    const result = await client.generate({
      system: 'be brief',
      messages: [{ role: 'user', content: 'hi' }],
      schemaName: 'thing',
      schema: { type: 'OBJECT', properties: { ok: { type: 'BOOLEAN' } } },
    });

    expect(result).toEqual({ text: '{"ok":true}', model: 'qwen-test' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:1234/v1/chat/completions');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('qwen-test');
    expect(body.stream).toBe(false);
    expect(body.messages).toEqual([
      { role: 'system', content: 'be brief' },
      { role: 'user', content: 'hi' },
    ]);
    expect(body.response_format).toEqual({
      type: 'json_schema',
      json_schema: {
        name: 'thing',
        strict: true,
        schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
      },
    });
  });

  it('omits response_format for plain text and sends the API key when set', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completion('plain'));
    const client = createLlmClient({ ...lmEnv, LMSTUDIO_API_KEY: 'secret', LMSTUDIO_BASE_URL: 'http://box:5555/v1/' }, fetchMock)!;
    await client.generate({ messages: [{ role: 'user', content: 'hi' }], temperature: 0.2 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://box:5555/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer secret');
    const body = JSON.parse(init.body);
    expect(body.response_format).toBeUndefined();
    expect(body.temperature).toBe(0.2);
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('strips reasoning from the reply and reports the model LM Studio used', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completion('<think>x</think>answer', 'loaded-model'));
    const client = createLlmClient(lmEnv, fetchMock)!;
    await expect(client.generate({ messages: [{ role: 'user', content: 'hi' }] })).resolves.toEqual({
      text: 'answer',
      model: 'loaded-model',
    });
  });

  it('ignores the Gemini model the UI asks for', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completion('ok'));
    const client = createLlmClient(lmEnv, fetchMock)!;
    await client.generate({ messages: [{ role: 'user', content: 'hi' }] }, 'gemini-3.8-flash');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('qwen-test');
  });

  it('discovers the loaded model when LMSTUDIO_MODEL is blank', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === 'http://localhost:1234/api/v0/models') {
        return json(200, {
          data: [
            { id: 'text-embedding-x', type: 'embeddings', state: 'loaded' },
            { id: 'idle-model', type: 'llm', state: 'not-loaded' },
            { id: 'loaded-model', type: 'llm', state: 'loaded' },
          ],
        });
      }
      return completion('ok', 'loaded-model');
    });
    const client = createLlmClient({ LLM_PROVIDER: 'lmstudio' }, fetchMock as unknown as typeof fetch)!;
    await client.generate({ messages: [{ role: 'user', content: 'hi' }] });
    expect(chatBody(fetchMock).model).toBe('loaded-model');
  });

  it('falls back to the first non-embedding model from /models', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/api/v0/')) return json(404, {});
      if (url.endsWith('/models')) return json(200, { data: [{ id: 'nomic-embed-text' }, { id: 'llama-3' }] });
      return completion('ok');
    });
    const client = createLlmClient({ LLM_PROVIDER: 'lmstudio' }, fetchMock as unknown as typeof fetch)!;
    await client.generate({ messages: [{ role: 'user', content: 'hi' }] });
    expect(chatBody(fetchMock).model).toBe('llama-3');
  });

  it('explains how to fix an unreachable server', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    const client = createLlmClient(lmEnv, fetchMock)!;
    await expect(client.generate({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow(
      'Could not reach LM Studio at http://localhost:1234/v1'
    );
  });

  it('never puts URL credentials in the unreachable error or the status', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    const client = createLlmClient({ ...lmEnv, LMSTUDIO_BASE_URL: 'http://user:pw@box:1234/v1' }, fetchMock)!;
    const failure = await client.generate({ messages: [{ role: 'user', content: 'hi' }] }).catch((e) => e.message);
    expect(failure).toContain('http://box:1234/v1');
    expect(failure).not.toContain('pw');

    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const status = await createLlmClient({ LLM_PROVIDER: 'lmstudio', LMSTUDIO_BASE_URL: 'http://user:pw@box:1234/v1' }, fetchMock)!.status();
    expect(JSON.stringify(status)).not.toContain('pw');
    expect(status).not.toHaveProperty('error');
  });

  it("surfaces LM Studio's error message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(400, { error: 'Model failed to load' }));
    const client = createLlmClient(lmEnv, fetchMock)!;
    await expect(client.generate({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow(
      'LM Studio returned 400: Model failed to load'
    );
  });

  it('rejects an empty completion', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completion('<think>only thoughts</think>'));
    const client = createLlmClient(lmEnv, fetchMock)!;
    await expect(client.generate({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow('empty response');
  });

  it('reports status for a reachable and an unreachable server', async () => {
    const ok = createLlmClient(lmEnv, vi.fn())!;
    await expect(ok.status()).resolves.toMatchObject({ provider: 'lmstudio', label: 'LM Studio · qwen-test', reachable: true });

    const down = createLlmClient({ LLM_PROVIDER: 'lmstudio' }, vi.fn().mockRejectedValue(new TypeError('fetch failed')))!;
    await expect(down.status()).resolves.toMatchObject({ provider: 'lmstudio', reachable: false });
  });
});
