import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app/createApp.jsx';
import { MemoryKVAdapter } from '../src/adapters/kv/memoryKv.js';

const createTestApp = (kv = new MemoryKVAdapter()) => {
  return createApp({
    kv,
    config: {
      shortLinkTtlSeconds: 3600,
      configTtlSeconds: 3600,
    },
    logger: {
      info() {},
      warn() {},
      error() {},
    },
  });
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /config', () => {
  it('returns formatted stored config content and inferred type', async () => {
    const kv = new MemoryKVAdapter();
    const app = createTestApp(kv);

    const saveResponse = await app.request('http://localhost/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'clash',
        content: 'mixed-port: 7890\nmode: rule\n',
      }),
    });

    expect(saveResponse.status).toBe(200);
    const configId = (await saveResponse.text()).trim();

    const response = await app.request(`http://localhost/config?id=${encodeURIComponent(configId)}`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.id).toBe(configId);
    expect(data.type).toBe('clash');
    expect(data.content).toContain('mixed-port: 7890');
    expect(data.content).toContain('mode: rule');
  });

  it('returns 404 when config is missing', async () => {
    const app = createTestApp();
    const response = await app.request('http://localhost/config?id=clash_missing');
    expect(response.status).toBe(404);
  });
});

describe('Client simulation', () => {
  it('uses the simulated client user-agent for xray requests when no ua query is provided', async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(
      new Response('vmess://ZXhhbXBsZQ==', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      }),
    );
    vi.stubGlobal('fetch', upstreamFetch);

    const app = createTestApp();
    const response = await app.request('http://localhost/xray?config=https%3A%2F%2Fexample.com%2Fsubscription', {
      headers: {
        'User-Agent': 'Mozilla/5.0 Test Browser',
      },
    });

    expect(response.status).toBe(200);
    expect(upstreamFetch).toHaveBeenCalledTimes(1);
    expect(upstreamFetch.mock.calls[0][1]?.headers?.['User-Agent']).toBe('v2rayN/6.45');
  });

  it('prefers the client marker in raw requests over the browser user-agent', async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(
      new Response('ss://YWVzLTEyOC1nY206dGVzdA@example.com:443#demo', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      }),
    );
    vi.stubGlobal('fetch', upstreamFetch);

    const app = createTestApp();
    const url = 'http://localhost/clash?config=https%3A%2F%2Fexample.com%2Fsubscription&client=clash';
    const response = await app.request(`http://localhost/raw?url=${encodeURIComponent(url)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 Test Browser',
      },
    });

    expect(response.status).toBe(200);
    expect(upstreamFetch).toHaveBeenCalledTimes(1);
    expect(upstreamFetch.mock.calls[0][1]?.headers?.['User-Agent']).toBe('Clash.Meta/1.18.0');
  });

  it('still prefers an explicit ua query over simulated client defaults', async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(
      new Response('ss://YWVzLTEyOC1nY206dGVzdA@example.com:443#demo', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      }),
    );
    vi.stubGlobal('fetch', upstreamFetch);

    const app = createTestApp();
    const response = await app.request('http://localhost/xray?config=https%3A%2F%2Fexample.com%2Fsubscription&client=xray&ua=CustomUA%2F9.9');

    expect(response.status).toBe(200);
    expect(upstreamFetch).toHaveBeenCalledTimes(1);
    expect(upstreamFetch.mock.calls[0][1]?.headers?.['User-Agent']).toBe('CustomUA/9.9');
  });

  it('prefers an actual recognized clash client user-agent over the simulated clash default', async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(
      new Response('ss://YWVzLTEyOC1nY206dGVzdA@example.com:443#demo', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      }),
    );
    vi.stubGlobal('fetch', upstreamFetch);

    const app = createTestApp();
    const response = await app.request('http://localhost/xray?config=https%3A%2F%2Fexample.com%2Fsubscription&client=clash', {
      headers: {
        'User-Agent': 'Clash for Windows/0.20.39',
      },
    });

    expect(response.status).toBe(200);
    expect(upstreamFetch).toHaveBeenCalledTimes(1);
    expect(upstreamFetch.mock.calls[0][1]?.headers?.['User-Agent']).toBe('Clash for Windows/0.20.39');
  });
});