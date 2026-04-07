import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import { createTranslator } from '../src/i18n/index.js';
import { ClashConfigBuilder } from '../src/builders/ClashConfigBuilder.js';
import { sanitizeClashProxyGroups } from '../src/builders/helpers/clashConfigUtils.js';

// Create translator for tests
const t = createTranslator('zh-CN');

describe('Clash Builder Tests', () => {
  it('should clean up proxy-groups and remove non-existent proxies', async () => {
    const config = {
      proxies: [
        {
          name: 'Valid-SS',
          type: 'ss',
          server: 'example.com',
          port: 443,
          cipher: 'aes-128-gcm',
          password: 'test'
        }
      ],
      'proxy-groups': [
        {
          name: '自定义选择',
          type: 'select',
          proxies: ['DIRECT', 'REJECT', 'Valid-SS', 'NotExist']
        }
      ]
    };

    sanitizeClashProxyGroups(config);

    const grp = (config['proxy-groups'] || []).find(g => g && g.name === '自定义选择');
    expect(grp).toBeDefined();
    expect(grp.proxies).toEqual(['DIRECT', 'REJECT', 'Valid-SS']);
  });

  it('should reference user-defined proxy-providers in generated proxy-groups', async () => {
    const input = `
proxy-providers:
  my-provider:
    type: http
    url: https://example.com/sub
    path: ./my.yaml
    interval: 3600

proxies:
  - name: local
    type: ss
    server: 127.0.0.1
    port: 1080
    cipher: aes-256-gcm
    password: test
`;

    const builder = new ClashConfigBuilder(input, 'minimal', [], null, 'zh-CN', 'test-agent');
    const yamlText = await builder.build();
    const built = yaml.load(yamlText);

    const nodeSelect = (built['proxy-groups'] || []).find(g => g && g.name === '🚀 节点选择');
    expect(nodeSelect).toBeDefined();
    expect(nodeSelect.use).toContain('my-provider');
  });

  it('sanitizeClashProxyGroups should not remove provider node references when group uses providers', () => {
    const config = {
      proxies: [],
      'proxy-groups': [
        {
          name: 'Custom Group',
          type: 'select',
          use: ['my-provider'],
          proxies: ['node-from-provider']
        }
      ]
    };

    sanitizeClashProxyGroups(config);

    const grp = (config['proxy-groups'] || [])[0];
    expect(grp).toBeDefined();
    expect(grp.proxies).toContain('node-from-provider');
  });

  it('should default Private and Location:CN groups to DIRECT', async () => {
    const input = `
ss://YWVzLTEyOC1nY206dGVzdA@example.com:443#HK-Node-1
ss://YWVzLTEyOC1nY206dGVzdA@example.com:444#US-Node-1
    `;

    const builder = new ClashConfigBuilder(input, 'minimal', [], null, 'zh-CN', 'test-agent');
    const yamlText = await builder.build();
    const built = yaml.load(yamlText);

    const privateName = t('outboundNames.Private');
    const cnName = t('outboundNames.Location:CN');

    const privateGroup = (built['proxy-groups'] || []).find(g => g && g.name === privateName);
    const cnGroup = (built['proxy-groups'] || []).find(g => g && g.name === cnName);

    expect(privateGroup).toBeDefined();
    expect(cnGroup).toBeDefined();

    // DIRECT should be the first option (default selected)
    expect(privateGroup.proxies[0]).toBe('DIRECT');
    expect(cnGroup.proxies[0]).toBe('DIRECT');

    // Other groups should NOT default to DIRECT
    const fallbackName = t('outboundNames.Fall Back');
    const fallbackGroup = (built['proxy-groups'] || []).find(g => g && g.name === fallbackName);
    expect(fallbackGroup).toBeDefined();
    expect(fallbackGroup.proxies[0]).not.toBe('DIRECT');
  });

  it('should filter legacy-unsupported proxies for Clash for Windows', async () => {
    const input = `hysteria2://580ef251-af2b-49f4-aea4-56a8a8f7a391@demo.de:8443?peer=demo.de&insecure=0&sni=demo.de&alpn=h3#USA-HY2
vless://580ef251-af2b-49f4-aea4-56a8a8f7a391@1.2.3.4:8443?encryption=none&security=reality&type=tcp&sni=m.media-amazon.com&fp=chrome&pbk=testpublickey&sid=testsid&flow=xtls-rprx-vision#USA-VLESS
trojan://password@example.com:443?security=tls&sni=example.com#USA-TROJAN`;

    const builder = new ClashConfigBuilder(input, 'minimal', [], null, 'zh-CN', 'Clash for Windows/0.20.39');
    const yamlText = await builder.build();
    const built = yaml.load(yamlText);

    const proxyNames = (built.proxies || []).map((proxy) => proxy?.name);
    expect(proxyNames).toContain('USA-TROJAN');
    expect(proxyNames).not.toContain('USA-HY2');
    expect(proxyNames).not.toContain('USA-VLESS');
  });

  it('should keep modern proxies for Clash.Meta based clients', async () => {
    const input = `hysteria2://580ef251-af2b-49f4-aea4-56a8a8f7a391@demo.de:8443?peer=demo.de&insecure=0&sni=demo.de&alpn=h3#USA-HY2
vless://580ef251-af2b-49f4-aea4-56a8a8f7a391@1.2.3.4:8443?encryption=none&security=reality&type=tcp&sni=m.media-amazon.com&fp=chrome&pbk=testpublickey&sid=testsid&flow=xtls-rprx-vision#USA-VLESS
trojan://password@example.com:443?security=tls&sni=example.com#USA-TROJAN`;

    const builder = new ClashConfigBuilder(input, 'minimal', [], null, 'zh-CN', 'Clash.Meta/1.18.0');
    const yamlText = await builder.build();
    const built = yaml.load(yamlText);

    const proxyNames = (built.proxies || []).map((proxy) => proxy?.name);
    expect(proxyNames).toContain('USA-TROJAN');
    expect(proxyNames).toContain('USA-HY2');
    expect(proxyNames).toContain('USA-VLESS');
  });
});
