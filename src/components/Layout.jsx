import { html } from 'hono/html'
import { APP_KEYWORDS } from '../constants.js';

export const Layout = (props) => {
  const { title, children } = props
  return html`
    <!DOCTYPE html>
    <html lang="en" x-data="appData()">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <meta name="description" content="Convert and optimize your subscription links easily" />
        <meta name="keywords" content="${APP_KEYWORDS}" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
        <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js" crossorigin="anonymous"></script>
        <script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js" crossorigin="anonymous"></script>
        <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.10/dist/cdn.min.js" crossorigin="anonymous" onerror="window.__alpineFailed=true"></script>
        <script>
          (function () {
            // Error capture helper for debugging client-side runtime issues.
            // Enable UI overlay via ?debug=1, while always caching the last error in localStorage.
            const params = new URLSearchParams(window.location.search);
            const debugEnabled = params.get('debug') === '1';
            const storageKey = 'sublink_last_client_error';

            function serializeReason(reason) {
              if (!reason) return { message: 'Unknown error', stack: '' };
              if (reason instanceof Error) return { message: reason.message || String(reason), stack: reason.stack || '' };
              if (typeof reason === 'object') {
                const message = reason.message ? String(reason.message) : JSON.stringify(reason);
                return { message, stack: reason.stack ? String(reason.stack) : '' };
              }
              return { message: String(reason), stack: '' };
            }

            function cacheError(payload) {
              try {
                localStorage.setItem(storageKey, JSON.stringify(payload));
              } catch (_) {
                // ignore
              }
            }

            window.copyTextToClipboard = async function (value) {
              const text = String(value ?? '');

              if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                try {
                  await navigator.clipboard.writeText(text);
                  return true;
                } catch (_) {
                  // Fall through to the legacy copy path.
                }
              }

              const textarea = document.createElement('textarea');
              textarea.value = text;
              textarea.setAttribute('readonly', '');
              textarea.style.position = 'fixed';
              textarea.style.top = '-9999px';
              textarea.style.left = '-9999px';
              document.body.appendChild(textarea);
              textarea.focus();
              textarea.select();

              let copied = false;
              try {
                copied = document.execCommand('copy');
              } finally {
                textarea.remove();
              }

              if (!copied) {
                throw new Error('Clipboard copy failed');
              }

              return true;
            };

            function getResourceTargetInfo(target) {
              if (!target || typeof target !== 'object') return null;
              const tagName = (target.tagName || '').toUpperCase();
              if (!tagName) return null;
              if (tagName === 'SCRIPT') {
                return { tagName, src: target.src || '' };
              }
              if (tagName === 'LINK') {
                return { tagName, href: target.href || '', rel: target.rel || '' };
              }
              return { tagName };
            }

            function showOverlay(payload) {
              if (!debugEnabled) return;
              try {
                const append = () => {
                  const body = document.body;
                  if (!body) {
                    return false;
                  }

                  const existing = document.getElementById('sublink-debug-error-overlay');
                  if (existing) existing.remove();

                  const container = document.createElement('div');
                  container.id = 'sublink-debug-error-overlay';
                  container.style.position = 'fixed';
                  container.style.inset = '0';
                  container.style.zIndex = '999';
                  container.style.background = 'rgba(0,0,0,0.6)';
                  container.style.padding = '16px';
                  container.style.overflow = 'auto';

                  const box = document.createElement('div');
                  box.style.maxWidth = '960px';
                  box.style.margin = '0 auto';
                  box.style.background = '#fff';
                  box.style.color = '#111827';
                  box.style.borderRadius = '12px';
                  box.style.boxShadow = '0 10px 30px rgba(0,0,0,0.25)';
                  box.style.padding = '16px';

                  const header = document.createElement('div');
                  header.style.display = 'flex';
                  header.style.alignItems = 'center';
                  header.style.justifyContent = 'space-between';
                  header.style.gap = '12px';
                  header.style.marginBottom = '12px';

                  const title = document.createElement('div');
                  title.style.fontWeight = '600';
                  title.textContent = '客户端错误（debug=1）';

                  const close = document.createElement('button');
                  close.type = 'button';
                  close.textContent = '关闭';
                  close.style.padding = '6px 10px';
                  close.style.borderRadius = '8px';
                  close.style.border = '1px solid #e5e7eb';
                  close.style.background = '#f3f4f6';
                  close.style.cursor = 'pointer';
                  close.addEventListener('click', () => container.remove());

                  const pre = document.createElement('pre');
                  pre.style.fontSize = '12px';
                  pre.style.whiteSpace = 'pre-wrap';
                  pre.style.wordBreak = 'break-word';
                  pre.style.background = '#f9fafb';
                  pre.style.border = '1px solid #e5e7eb';
                  pre.style.borderRadius = '10px';
                  pre.style.padding = '12px';
                  pre.textContent = JSON.stringify(payload, null, 2);

                  const hint = document.createElement('div');
                  hint.style.fontSize = '12px';
                  hint.style.color = '#4b5563';
                  hint.style.marginTop = '12px';
                  hint.textContent = '请复制以上内容（包含 message/stack/source/line/column），用于定位 “is not a function” 的真实来源。';

                  header.appendChild(title);
                  header.appendChild(close);
                  box.appendChild(header);
                  box.appendChild(pre);
                  box.appendChild(hint);
                  container.appendChild(box);
                  body.appendChild(container);
                  return true;
                };

                const existing = document.getElementById('sublink-debug-error-overlay');
                if (existing) existing.remove();

                if (!append()) {
                  document.addEventListener('DOMContentLoaded', () => {
                    append();
                  }, { once: true });
                }
              } catch (_) {
                // ignore
              }
            }

            // Capture resource loading errors (script/css) with src/href.
            // Use capture phase to receive the event before it gets normalized.
            window.addEventListener('error', (e) => {
              const info = getResourceTargetInfo(e.target);
              if (!info) return;
              const payload = {
                type: 'resource-error',
                ts: new Date().toISOString(),
                resource: info
              };
              cacheError(payload);
              showOverlay(payload);
            }, true);

            // Capture runtime errors.
            window.addEventListener('error', (e) => {
              const err = serializeReason(e.error);
              const payload = {
                type: 'error',
                ts: new Date().toISOString(),
                message: e.message || err.message,
                stack: err.stack,
                source: e.filename || '',
                line: e.lineno || 0,
                column: e.colno || 0
              };
              cacheError(payload);
              showOverlay(payload);
            });

            window.addEventListener('unhandledrejection', (e) => {
              const err = serializeReason(e.reason);
              const payload = {
                type: 'unhandledrejection',
                ts: new Date().toISOString(),
                message: err.message,
                stack: err.stack
              };
              cacheError(payload);
              showOverlay(payload);
            });

            if (debugEnabled) {
              try {
                const cached = localStorage.getItem(storageKey);
                if (cached) {
                  const payload = JSON.parse(cached);
                  const timestamp = payload && payload.ts ? Date.parse(payload.ts) : NaN;
                  if (Number.isFinite(timestamp) && (Date.now() - timestamp) < 60000) {
                    showOverlay(payload);
                  }
                }
              } catch (_) {
                // ignore
              }
            }
          })();
        </script>
        <script>
          window.__alpineLoaded = false;
          document.addEventListener('alpine:init', () => { window.__alpineLoaded = true; });
          window.addEventListener('DOMContentLoaded', () => {
            if (window.__alpineFailed || !window.__alpineLoaded) {
              console.error('Failed to initialize Alpine.js. Interactive features are disabled.');
              const warning = document.createElement('div');
              warning.className = 'fixed bottom-4 right-4 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg shadow';
              warning.textContent = '加载 Alpine.js 失败，页面交互功能不可用，请刷新或检查网络。';
              document.body.appendChild(warning);
            }
          });
        </script>
        <style>
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            position: relative;
            min-height: 100vh;
          }

          /* Subtle radial gradient background */
          body::before {
            content: '';
            position: fixed;
            inset: 0;
            z-index: -2;
            background:
              radial-gradient(ellipse 80% 50% at 50% -20%, rgba(10, 163, 235, 0.08) 0%, transparent 60%),
              radial-gradient(ellipse 60% 40% at 90% 80%, rgba(51, 197, 255, 0.05) 0%, transparent 50%),
              radial-gradient(ellipse 50% 30% at 10% 90%, rgba(0, 130, 202, 0.04) 0%, transparent 50%);
            pointer-events: none;
          }

          .dark body::before,
          html.dark body::before {
            background:
              radial-gradient(ellipse 80% 50% at 50% -20%, rgba(10, 163, 235, 0.12) 0%, transparent 60%),
              radial-gradient(ellipse 60% 40% at 90% 80%, rgba(51, 197, 255, 0.06) 0%, transparent 50%),
              radial-gradient(ellipse 50% 30% at 10% 90%, rgba(0, 130, 202, 0.05) 0%, transparent 50%);
          }

          /* Subtle noise texture overlay */
          body::after {
            content: '';
            position: fixed;
            inset: 0;
            z-index: -1;
            opacity: 0.3;
            pointer-events: none;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
            background-repeat: repeat;
            background-size: 128px 128px;
          }

          .dark body::after,
          html.dark body::after {
            opacity: 0.15;
          }

          [x-cloak] { display: none !important; }
        </style>
        <script>
          function appData() {
            return {
              darkMode: localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches),
              toggleDarkMode() {
                this.darkMode = !this.darkMode;
                localStorage.setItem('theme', this.darkMode ? 'dark' : 'light');
                if (this.darkMode) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              },
              init() {
                if (this.darkMode) {
                  document.documentElement.classList.add('dark');
                }
              }
            }
          }

          // Version update checker Alpine.js component
          function updateChecker(currentVersion, apiUrl) {
            return {
              currentVersion: currentVersion,
              latestVersion: '',
              showUpdateToast: false,
              i18n: {
                newVersionAvailable: getUpdateI18n('newVersionAvailable'),
                currentVersion: getUpdateI18n('currentVersion'),
                viewRelease: getUpdateI18n('viewRelease'),
                updateGuide: getUpdateI18n('updateGuide'),
                later: getUpdateI18n('later')
              },
              init() {
                // Check for updates after a short delay to not block initial render
                setTimeout(() => this.checkForUpdates(), 3000);
              },
              async checkForUpdates() {
                try {
                  // Check if user dismissed this version before
                  const dismissedVersion = localStorage.getItem('sublink_dismissed_version');
                  const lastCheck = localStorage.getItem('sublink_last_version_check');
                  const now = Date.now();
                  
                  // Only check once per hour to avoid rate limiting
                  if (lastCheck && (now - parseInt(lastCheck)) < 3600000) {
                    const cachedVersion = localStorage.getItem('sublink_latest_version');
                    if (cachedVersion && cachedVersion !== dismissedVersion && this.compareVersions(cachedVersion, this.currentVersion) > 0) {
                      this.latestVersion = cachedVersion;
                      this.showUpdateToast = true;
                    }
                    return;
                  }

                  const response = await fetch(apiUrl, {
                    headers: { 'Accept': 'application/vnd.github.v3+json' }
                  });
                  
                  if (!response.ok) return;
                  
                  const data = await response.json();
                  const latestVersion = (data.tag_name || '').replace(/^v/, '');
                  
                  // Cache the result
                  localStorage.setItem('sublink_latest_version', latestVersion);
                  localStorage.setItem('sublink_last_version_check', now.toString());
                  
                  // Compare versions
                  if (latestVersion && latestVersion !== dismissedVersion && this.compareVersions(latestVersion, this.currentVersion) > 0) {
                    this.latestVersion = latestVersion;
                    this.showUpdateToast = true;
                  }
                } catch (error) {
                  console.debug('Version check failed:', error.message);
                }
              },
              compareVersions(v1, v2) {
                const parts1 = v1.split('.').map(Number);
                const parts2 = v2.split('.').map(Number);
                for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
                  const p1 = parts1[i] || 0;
                  const p2 = parts2[i] || 0;
                  if (p1 > p2) return 1;
                  if (p1 < p2) return -1;
                }
                return 0;
              },
              dismissUpdate() {
                this.showUpdateToast = false;
                localStorage.setItem('sublink_dismissed_version', this.latestVersion);
              }
            }
          }

          // i18n helper for update checker
          function getUpdateI18n(key) {
            const lang = navigator.language || 'en-US';
            const translations = {
              'zh-CN': {
                newVersionAvailable: '发现新版本',
                currentVersion: '当前版本',
                viewRelease: '查看更新',
                updateGuide: '更新指南',
                later: '稍后提醒'
              },
              'zh-TW': {
                newVersionAvailable: '發現新版本',
                currentVersion: '當前版本',
                viewRelease: '查看更新',
                updateGuide: '更新指南',
                later: '稍後提醒'
              },
              'en-US': {
                newVersionAvailable: 'New Version Available',
                currentVersion: 'Current',
                viewRelease: 'View Release',
                updateGuide: 'Update Guide',
                later: 'Later'
              },
              'fa': {
                newVersionAvailable: 'نسخه جدید موجود است',
                currentVersion: 'نسخه فعلی',
                viewRelease: 'مشاهده نسخه',
                updateGuide: 'راهنمای به‌روزرسانی',
                later: 'بعداً'
              },
              'ru': {
                newVersionAvailable: 'Доступна новая версия',
                currentVersion: 'Текущая',
                viewRelease: 'Посмотреть',
                updateGuide: 'Руководство по обновлению',
                later: 'Позже'
              }
            };
            const langKey = Object.keys(translations).find(k => lang.startsWith(k.split('-')[0])) || 'en-US';
            return translations[langKey][key] || translations['en-US'][key];
          }
        </script>
      </head>
      <body class="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        ${children}
      </body>
    </html>
  `
}
