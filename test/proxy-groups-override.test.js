import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';

import { ClashConfigBuilder } from '../src/builders/ClashConfigBuilder.js';
import { SingboxConfigBuilder } from '../src/builders/SingboxConfigBuilder.js';
import { SurgeConfigBuilder } from '../src/builders/SurgeConfigBuilder.js';
import {
    parseSingboxJson,
    parseClashYaml,
    parseSurgeIni
} from '../src/parsers/subscription/subscriptionContentParser.js';
import { createTranslator } from '../src/i18n/index.js';

describe('Unified Proxy-Groups Handling', () => {
    describe('Parser Level - proxy-groups extraction', () => {
        it('parseClashYaml should preserve proxy-groups in config override', () => {
            const clashConfig = `
proxies:
  - name: HK-Node
    type: ss
    server: hk.example.com
    port: 443
    cipher: aes-128-gcm
    password: test
proxy-groups:
  - name: 自定义选择
    type: select
    proxies:
      - DIRECT
      - REJECT
      - HK-Node
  - name: 自动测速
    type: url-test
    proxies:
      - HK-Node
    url: http://www.gstatic.com/generate_204
    interval: 300
`;
            const result = parseClashYaml(clashConfig);

            expect(result).not.toBeNull();
            expect(result.type).toBe('yamlConfig');
            expect(result.proxies).toHaveLength(1);
            expect(result.config).toBeDefined();
            expect(result.config['proxy-groups']).toBeDefined();
            expect(result.config['proxy-groups']).toHaveLength(2);

            const selectGroup = result.config['proxy-groups'].find((g) => g.name === '自定义选择');
            expect(selectGroup).toBeDefined();
            expect(selectGroup.type).toBe('select');
            expect(selectGroup.proxies).toContain('HK-Node');
        });

        it('parseSingboxJson should extract selector/urltest and convert to proxy-groups format', () => {
            const singboxConfig = JSON.stringify({
                outbounds: [
                    {
                        type: 'shadowsocks',
                        tag: 'HK-Node',
                        server: 'hk.example.com',
                        server_port: 443,
                        method: 'aes-128-gcm',
                        password: 'test'
                    },
                    {
                        type: 'selector',
                        tag: '自定义选择',
                        outbounds: ['DIRECT', 'REJECT', 'HK-Node']
                    },
                    {
                        type: 'urltest',
                        tag: '自动测速',
                        outbounds: ['HK-Node'],
                        url: 'http://www.gstatic.com/generate_204',
                        interval: '5m'
                    },
                    { type: 'direct', tag: 'DIRECT' },
                    { type: 'block', tag: 'REJECT' }
                ]
            });

            const result = parseSingboxJson(singboxConfig);

            expect(result).not.toBeNull();
            expect(result.type).toBe('singboxConfig');
            expect(result.proxies).toHaveLength(1);
            expect(result.proxies[0].tag).toBe('HK-Node');

            expect(result.config).toBeDefined();
            expect(result.config['proxy-groups']).toBeDefined();
            expect(result.config['proxy-groups']).toHaveLength(2);

            const selectGroup = result.config['proxy-groups'].find((g) => g.name === '自定义选择');
            expect(selectGroup).toBeDefined();
            expect(selectGroup.type).toBe('select');
            expect(selectGroup.proxies).toContain('HK-Node');

            const urlTestGroup = result.config['proxy-groups'].find((g) => g.name === '自动测速');
            expect(urlTestGroup).toBeDefined();
            expect(urlTestGroup.type).toBe('url-test');
            expect(urlTestGroup.proxies).toContain('HK-Node');
        });

        it('parseSurgeIni should parse proxy-groups strings into objects', () => {
            const surgeConfig = `
[General]
loglevel = notify

[Proxy]
HK-Node = ss, hk.example.com, 443, encrypt-method=aes-128-gcm, password=test

[Proxy Group]
自定义选择 = select, DIRECT, REJECT, HK-Node
自动测速 = url-test, HK-Node, url=http://www.gstatic.com/generate_204, interval=300

[Rule]
FINAL,DIRECT
`;
            const result = parseSurgeIni(surgeConfig);

            expect(result).not.toBeNull();
            expect(result.type).toBe('surgeConfig');
            expect(result.proxies).toHaveLength(1);

            expect(result.config).toBeDefined();
            expect(result.config['proxy-groups']).toBeDefined();
            expect(result.config['proxy-groups']).toHaveLength(2);

            const selectGroup = result.config['proxy-groups'].find((g) => g.name === '自定义选择');
            expect(selectGroup).toBeDefined();
            expect(selectGroup.type).toBe('select');
            expect(selectGroup.proxies).toContain('HK-Node');

            const urlTestGroup = result.config['proxy-groups'].find((g) => g.name === '自动测速');
            expect(urlTestGroup).toBeDefined();
            expect(urlTestGroup.type).toBe('url-test');
            expect(urlTestGroup.proxies).toContain('HK-Node');
        });
    });

    describe('Builder Level - input proxy-groups ignored', () => {
        const t = createTranslator('zh-CN');

        const clashInput = `
proxies:
  - name: HK-Node
    type: ss
    server: hk.example.com
    port: 443
    cipher: aes-128-gcm
    password: test
proxy-groups:
  - name: 自定义选择
    type: select
    proxies:
      - DIRECT
      - REJECT
      - HK-Node
`;

        const singboxInput = JSON.stringify({
            outbounds: [
                {
                    type: 'shadowsocks',
                    tag: 'HK-Node',
                    server: 'hk.example.com',
                    server_port: 443,
                    method: 'aes-128-gcm',
                    password: 'test'
                },
                {
                    type: 'selector',
                    tag: '自定义选择',
                    outbounds: ['DIRECT', 'REJECT', 'HK-Node']
                },
                { type: 'direct', tag: 'DIRECT' },
                { type: 'block', tag: 'REJECT' }
            ]
        });

        const surgeInput = `
[General]
loglevel = notify

[Proxy]
HK-Node = ss, hk.example.com, 443, encrypt-method=aes-128-gcm, password=test

[Proxy Group]
自定义选择 = select, DIRECT, REJECT, HK-Node

[Rule]
FINAL,DIRECT
`;

        it('ClashConfigBuilder should ignore custom proxy-groups from Clash input', async () => {
            const builder = new ClashConfigBuilder(clashInput, 'minimal', [], null, 'zh-CN', 'test-agent');
            const yamlText = await builder.build();
            const built = yaml.load(yamlText);

            const customGroup = (built['proxy-groups'] || []).find((g) => g && g.name === '自定义选择');
            expect(customGroup).toBeUndefined();

            const nodeSelectName = t('outboundNames.Node Select');
            const nodeSelect = (built['proxy-groups'] || []).find((g) => g && g.name === nodeSelectName);
            expect(nodeSelect).toBeDefined();
        });

        it('SingboxConfigBuilder should ignore selector/urltest from Sing-Box input', async () => {
            const builder = new SingboxConfigBuilder(singboxInput, 'minimal', [], null, 'zh-CN', 'test-agent');
            await builder.build();

            const customOutbound = (builder.config.outbounds || []).find((o) => o && o.tag === '自定义选择');
            expect(customOutbound).toBeUndefined();

            const nodeSelectName = t('outboundNames.Node Select');
            const nodeSelect = (builder.config.outbounds || []).find((o) => o && o.tag === nodeSelectName);
            expect(nodeSelect).toBeDefined();
        });

        it('SurgeConfigBuilder should ignore proxy-groups from Surge input', async () => {
            const builder = new SurgeConfigBuilder(surgeInput, 'minimal', [], null, 'zh-CN', 'test-agent', false);
            const text = await builder.build();
            expect(text).not.toContain('自定义选择');
        });
    });

    describe('DNS overrides - merge behavior', () => {
        it('mergeDnsConfig should merge array values and deduplicate', async () => {
            const input = `
proxies:
  - name: Node-A
    type: ss
    server: a.example.com
    port: 443
    cipher: aes-128-gcm
    password: test
`;
            const builder = new ClashConfigBuilder(input, 'minimal', [], null, 'zh-CN', 'test-agent');

            const existingDns = { enable: true, nameserver: ['8.8.8.8', '8.8.4.4'], fallback: ['1.0.0.1'] };
            const incomingDns = { nameserver: ['1.1.1.1', '8.8.8.8'], fallback: ['9.9.9.9'] };
            const merged = builder.mergeDnsConfig(existingDns, incomingDns);

            expect(merged.nameserver).toContain('8.8.8.8');
            expect(merged.nameserver).toContain('8.8.4.4');
            expect(merged.nameserver).toContain('1.1.1.1');
            expect(merged.nameserver.filter((n) => n === '8.8.8.8')).toHaveLength(1);

            expect(merged.fallback).toContain('1.0.0.1');
            expect(merged.fallback).toContain('9.9.9.9');
            expect(merged.enable).toBe(true);
        });

        it('mergeDnsConfig should merge fake-ip-filter arrays', async () => {
            const input = `
proxies:
  - name: Node-A
    type: ss
    server: a.example.com
    port: 443
    cipher: aes-128-gcm
    password: test
`;
            const builder = new ClashConfigBuilder(input, 'minimal', [], null, 'zh-CN', 'test-agent');

            const existingDns = {
                'fake-ip-filter': ['*.lan', '*.local']
            };
            const incomingDns = {
                'fake-ip-filter': ['*.local', '*.internal', 'localhost']
            };
            const merged = builder.mergeDnsConfig(existingDns, incomingDns);

            expect(merged['fake-ip-filter']).toContain('*.lan');
            expect(merged['fake-ip-filter']).toContain('*.local');
            expect(merged['fake-ip-filter']).toContain('*.internal');
            expect(merged['fake-ip-filter']).toContain('localhost');
            expect(merged['fake-ip-filter'].filter((f) => f === '*.local')).toHaveLength(1);
        });

        it('mergeDnsConfig should merge nameserver-policy objects', async () => {
            const input = `
proxies:
  - name: Node-A
    type: ss
    server: a.example.com
    port: 443
    cipher: aes-128-gcm
    password: test
`;
            const builder = new ClashConfigBuilder(input, 'minimal', [], null, 'zh-CN', 'test-agent');

            const existingDns = {
                'nameserver-policy': {
                    '+.google.com': '8.8.8.8'
                }
            };
            const incomingDns = {
                'nameserver-policy': {
                    '+.github.com': '1.1.1.1',
                    '+.google.com': '8.8.4.4'
                }
            };
            const merged = builder.mergeDnsConfig(existingDns, incomingDns);

            expect(merged['nameserver-policy']['+.github.com']).toBe('1.1.1.1');
            expect(merged['nameserver-policy']['+.google.com']).toBe('8.8.4.4');
        });

        it('mergeDnsConfig should handle null/undefined existing config', async () => {
            const input = `
proxies:
  - name: Node-A
    type: ss
    server: a.example.com
    port: 443
    cipher: aes-128-gcm
    password: test
`;
            const builder = new ClashConfigBuilder(input, 'minimal', [], null, 'zh-CN', 'test-agent');

            const incomingDns = { nameserver: ['1.1.1.1'], enable: true };
            const merged = builder.mergeDnsConfig(null, incomingDns);

            expect(merged.nameserver).toEqual(['1.1.1.1']);
            expect(merged.enable).toBe(true);
        });
    });
});
