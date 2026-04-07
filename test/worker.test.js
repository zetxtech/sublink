import { describe, it, expect, vi, afterEach } from 'vitest';
import { createApp } from '../src/app/createApp.jsx';
import { MemoryKVAdapter } from '../src/adapters/kv/memoryKv.js';
import yaml from 'js-yaml';

const createTestApp = (overrides = {}) => {
    const runtime = {
        kv: overrides.kv ?? new MemoryKVAdapter(),
        assetFetcher: overrides.assetFetcher ?? null,
        logger: console,
        config: {
            configTtlSeconds: 60,
            shortLinkTtlSeconds: null,
            ...(overrides.config || {})
        }
    };
    return createApp(runtime);
};

afterEach(() => {
    vi.restoreAllMocks();
});

describe('Worker', () => {
    it('GET / returns HTML', async () => {
        const app = createTestApp();
        const res = await app.request('http://localhost/');
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/html');
        const text = await res.text();
        expect(text).toContain('Sublink Worker');
    });

    it('GET /singbox returns JSON', async () => {
        const app = createTestApp();
        const config = 'vmess://ew0KICAidiI6ICIyIiwNCiAgInBzIjogInRlc3QiLA0KICAiYWRkIjogIjEuMS4xLjEiLA0KICAicG9ydCI6ICI0NDMiLA0KICAiaWQiOiAiYWRkNjY2NjYtODg4OC04ODg4LTg4ODgtODg4ODg4ODg4ODg4IiwNCiAgImFpZCI6ICIwIiwNCiAgInNjeSI6ICJhdXRvIiwNCiAgIm5ldCI6ICJ3cyIsDQogICJ0eXBlIjogIm5vbmUiLA0KICAiaG9zdCI6ICIiLA0KICAicGF0aCI6ICIvIiwNCiAgInRscyI6ICJ0bHMiDQp9';
        const res = await app.request(`http://localhost/singbox?config=${encodeURIComponent(config)}`);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');
        const json = await res.json();
        expect(json).toHaveProperty('outbounds');
    });

    it('GET /singbox returns legacy config for sing-box 1.11 UA', async () => {
        const app = createTestApp();
        const config = 'vmess://ew0KICAidiI6ICIyIiwNCiAgInBzIjogInRlc3QiLA0KICAiYWRkIjogIjEuMS4xLjEiLA0KICAicG9ydCI6ICI0NDMiLA0KICAiaWQiOiAiYWRkNjY2NjYtODg4OC04ODg4LTg4ODgtODg4ODg4ODg4ODg4IiwNCiAgImFpZCI6ICIwIiwNCiAgInNjeSI6ICJhdXRvIiwNCiAgIm5ldCI6ICJ3cyIsDQogICJ0eXBlIjogIm5vbmUiLA0KICAiaG9zdCI6ICIiLA0KICAicGF0aCI6ICIvIiwNCiAgInRscyI6ICJ0bHMiDQp9';
        const res = await app.request(`http://localhost/singbox?config=${encodeURIComponent(config)}`, {
            headers: {
                'User-Agent': 'SFI/1.12.2 (Build 2; sing-box 1.11.4; language zh_CN)'
            }
        });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json?.dns?.servers?.[0]).toHaveProperty('address');
        expect(json?.dns?.servers?.[0]).not.toHaveProperty('type');
        expect(json?.route).not.toHaveProperty('default_domain_resolver');
    });

    it('GET /singbox returns 1.12+ config for sing-box 1.12 UA', async () => {
        const app = createTestApp();
        const config = 'vmess://ew0KICAidiI6ICIyIiwNCiAgInBzIjogInRlc3QiLA0KICAiYWRkIjogIjEuMS4xLjEiLA0KICAicG9ydCI6ICI0NDMiLA0KICAiaWQiOiAiYWRkNjY2NjYtODg4OC04ODg4LTg4ODgtODg4ODg4ODg4ODg4IiwNCiAgImFpZCI6ICIwIiwNCiAgInNjeSI6ICJhdXRvIiwNCiAgIm5ldCI6ICJ3cyIsDQogICJ0eXBlIjogIm5vbmUiLA0KICAiaG9zdCI6ICIiLA0KICAicGF0aCI6ICIvIiwNCiAgInRscyI6ICJ0bHMiDQp9';
        const res = await app.request(`http://localhost/singbox?config=${encodeURIComponent(config)}`, {
            headers: {
                'User-Agent': 'SFA/1.12.12 (587; sing-box 1.12.12; language zh_Hans_CN)'
            }
        });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json?.dns?.servers?.[0]).toHaveProperty('type');
        expect(json?.dns?.servers?.[0]).not.toHaveProperty('address');
        expect(json?.route).toHaveProperty('default_domain_resolver', 'dns_resolver');
    });

    it('GET /clash returns YAML', async () => {
        const app = createTestApp();
        const config = 'vmess://ew0KICAidiI6ICIyIiwNCiAgInBzIjogInRlc3QiLA0KICAiYWRkIjogIjEuMS4xLjEiLA0KICAicG9ydCI6ICI0NDMiLA0KICAiaWQiOiAiYWRkNjY2NjYtODg4OC04ODg4LTg4ODgtODg4ODg4ODg4ODg4IiwNCiAgImFpZCI6ICIwIiwNCiAgInNjeSI6ICJhdXRvIiwNCiAgIm5ldCI6ICJ3cyIsDQogICJ0eXBlIjogIm5vbmUiLA0KICAiaG9zdCI6ICIiLA0KICAicGF0aCI6ICIvIiwNCiAgInRscyI6ICJ0bHMiDQp9';
        const res = await app.request(`http://localhost/clash?config=${encodeURIComponent(config)}`);
        expect(res.status).toBe(200);
        // Clash builder returns text/yaml
        expect(res.headers.get('content-type')).toContain('text/yaml');
        const text = await res.text();
        expect(text).toContain('proxies:');
    });

    it('GET /shorten-v2 returns short code', async () => {
        const url = 'http://example.com';
        const kvMock = {
            put: vi.fn(async () => {}),
            get: vi.fn(async () => null),
            delete: vi.fn(async () => {})
        };
        const app = createTestApp({ kv: kvMock });
        const res = await app.request(`http://localhost/shorten-v2?url=${encodeURIComponent(url)}`);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toBeTruthy();
        expect(kvMock.put).toHaveBeenCalled();
    });

    it('GET /raw returns decoded subscription text', async () => {
        const app = createTestApp();
        const rawText = 'vmess://example\nss://example2';
        const base64 = Buffer.from(rawText, 'utf8').toString('base64');
        const res = await app.request(`http://localhost/raw?config=${encodeURIComponent(base64)}`);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/plain');
        const text = await res.text();
        expect(text.trim()).toBe(rawText);
    });

    it('GET /clash parses base64 subscriptions even when full URI decoding fails', async () => {
        const app = createTestApp();
        const upstreamText = 'vless://example.com:443#%E6%B5%8B%E8%AF%95%ZZ';
        const base64 = Buffer.from(upstreamText, 'utf8').toString('base64');

        vi.stubGlobal('fetch', vi.fn(async () => new Response(base64, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8'
            }
        })));

        const res = await app.request('http://localhost/clash?config=https%3A%2F%2Fexample.com%2Fsub');
        expect(res.status).toBe(200);

        const text = await res.text();
        expect(text).toContain('proxies:');
    });

    it('GET /clash keeps VLESS nodes with malformed percent-encoding', async () => {
        const app = createTestApp();
        const upstreamText = 'vless://123e4567-e89b-12d3-a456-426614174000@example.com:443?security=tls&type=ws&host=example.com&path=%2Fws#bad%ZZname';
        const base64 = Buffer.from(upstreamText, 'utf8').toString('base64');

        vi.stubGlobal('fetch', vi.fn(async () => new Response(base64, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8'
            }
        })));

        const res = await app.request('http://localhost/clash?config=https%3A%2F%2Fexample.com%2Fsub');
        expect(res.status).toBe(200);

        const text = await res.text();
        expect(text).toContain('proxies:');
        expect(text).toContain('bad%ZZname');
    });

    it('GET /clash keeps plain Clash YAML responses without treating them as base64', async () => {
        const app = createTestApp();
        const upstreamText = [
            'mixed-port: 7890',
            'allow-lan: false',
            'mode: rule',
            'proxies:',
            '  - name: Demo-Node',
            '    type: ss',
            '    server: example.com',
            '    port: 443',
            '    cipher: aes-128-gcm',
            '    password: test'
        ].join('\n');

        vi.stubGlobal('fetch', vi.fn(async () => new Response(upstreamText, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=UTF-8'
            }
        })));

        const res = await app.request('http://localhost/clash?config=https%3A%2F%2Fexample.com%2Fsub');
        expect(res.status).toBe(200);

        const text = await res.text();
        expect(text).toContain('Demo-Node');
        expect(text).toContain('proxies:');
    });

    it('GET /clash requests remote subscriptions with Accept-Encoding identity', async () => {
        const app = createTestApp();
        const upstreamFetch = vi.fn(async () => new Response([
            'proxies:',
            '  - name: Demo-Node',
            '    type: ss',
            '    server: example.com',
            '    port: 443',
            '    cipher: aes-128-gcm',
            '    password: test'
        ].join('\n'), {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=UTF-8'
            }
        }));

        vi.stubGlobal('fetch', upstreamFetch);

        const res = await app.request('http://localhost/clash?config=https%3A%2F%2Fexample.com%2Fsub', {
            headers: {
                'User-Agent': 'Clash.Meta/1.18.0'
            }
        });

        expect(res.status).toBe(200);
        expect(upstreamFetch).toHaveBeenCalledTimes(1);

        const requestHeaders = upstreamFetch.mock.calls[0][1]?.headers;
        const normalized = requestHeaders instanceof Headers ? requestHeaders : new Headers(requestHeaders);
        expect(normalized.get('Accept-Encoding')).toBe('identity');
    });

    it('GET /clash fails clearly when upstream returns a Cloudflare challenge page', async () => {
        const app = createTestApp();

        vi.stubGlobal('fetch', vi.fn(async () => new Response(
            '<!DOCTYPE html><html><head><title>Just a moment...</title></head><body></body></html>',
            {
                status: 403,
                headers: {
                    'Content-Type': 'text/html; charset=UTF-8',
                    'cf-mitigated': 'challenge'
                }
            }
        )));

        const res = await app.request('http://localhost/clash?config=https%3A%2F%2Fexample.com%2Fsub');
        expect(res.status).toBe(500);
        const text = await res.text();
        expect(text).toContain('HTTP error! status: 403');
    });

});
