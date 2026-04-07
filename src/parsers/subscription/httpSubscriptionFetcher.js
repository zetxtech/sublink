import { decodeBase64 } from '../../utils.js';
import { parseSubscriptionContent } from './subscriptionContentParser.js';

function isCloudflareChallengePage(text, response) {
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    const mitigated = String(response.headers.get('cf-mitigated') || '').toLowerCase();
    const sample = String(text || '').slice(0, 512).toLowerCase();

    return mitigated === 'challenge' || (
        contentType.includes('text/html') &&
        (sample.includes('<title>just a moment') || sample.includes('cf-challenge') || sample.includes('challenge-platform'))
    );
}

function arrayBufferToText(buffer) {
    return new TextDecoder().decode(buffer);
}

async function tryDecompressBuffer(buffer, encoding) {
    const normalized = String(encoding || '').toLowerCase();
    const candidates = [];

    if (normalized.includes('gzip')) {
        candidates.push('gzip');
    }
    if (normalized.includes('deflate')) {
        candidates.push('deflate');
    }

    const bytes = new Uint8Array(buffer);
    const startsWithGzipMagic = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
    if (startsWithGzipMagic && !candidates.includes('gzip')) {
        candidates.push('gzip');
    }

    for (const algorithm of candidates) {
        try {
            const stream = new Response(buffer).body?.pipeThrough(new DecompressionStream(algorithm));
            if (!stream) {
                continue;
            }
            const decompressed = await new Response(stream).arrayBuffer();
            return arrayBufferToText(decompressed);
        } catch {
            // Fall through to next candidate.
        }
    }

    return arrayBufferToText(buffer);
}

export async function readResponseText(response) {
    const buffer = await response.arrayBuffer();
    return tryDecompressBuffer(buffer, response.headers.get('content-encoding'));
}

function looksLikeBase64(text) {
    if (typeof text !== 'string') {
        return false;
    }

    const sanitized = text.replace(/\s+/g, '');
    if (!sanitized || sanitized.length % 4 !== 0) {
        return false;
    }

    return /^[A-Za-z0-9+/=]+$/.test(sanitized);
}

/**
 * Decode content, trying Base64 first, then URL decoding if needed
 * @param {string} text - Raw text content
 * @returns {string} - Decoded content
 */
function decodeContent(text) {
    let decodedText = text;

    if (looksLikeBase64(text.trim())) {
        try {
            decodedText = decodeBase64(text.trim());
        } catch {
            decodedText = text;
        }
    }

    if (decodedText.includes('%')) {
        try {
            decodedText = decodeURIComponent(decodedText);
        } catch {
            // Keep the original text when URI decoding fails partially.
        }
    }

    return decodedText;
}

/**
 * Detect the format of subscription content
 * @param {string} content - Decoded subscription content
 * @returns {'clash'|'singbox'|'unknown'} - Detected format
 */
function detectFormat(content) {
    const trimmed = content.trim();

    // Try JSON (Sing-Box format)
    if (trimmed.startsWith('{')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed.outbounds || parsed.inbounds || parsed.route) {
                return 'singbox';
            }
        } catch {
            // Not valid JSON
        }
    }

    // Try YAML (Clash format) - check for proxies: key
    if (trimmed.includes('proxies:')) {
        return 'clash';
    }

    return 'unknown';
}

/**
 * Fetch subscription content from a URL and parse it
 * @param {string} url - The subscription URL to fetch
 * @param {string} userAgent - Optional User-Agent header
 * @returns {Promise<object|string[]|null>} - Parsed subscription content
 */
export async function fetchSubscription(url, userAgent) {
    try {
        const headers = new Headers();
        headers.set('Accept-Encoding', 'identity');
        if (userAgent) {
            headers.set('User-Agent', userAgent);
        }
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await readResponseText(response);
        if (isCloudflareChallengePage(text, response)) {
            throw new Error('Upstream subscription is protected by Cloudflare challenge and cannot be fetched from Workers');
        }
        const decodedText = decodeContent(text);

        return parseSubscriptionContent(decodedText);
    } catch (error) {
        console.error('Error fetching or parsing HTTP(S) content:', error);
        throw error;
    }
}

/**
 * Fetch subscription content and detect its format without parsing
 * @param {string} url - The subscription URL to fetch
 * @param {string} userAgent - Optional User-Agent header
 * @returns {Promise<{content: string, format: 'clash'|'singbox'|'unknown', url: string}|null>}
 */
export async function fetchSubscriptionWithFormat(url, userAgent) {
    try {
        const headers = new Headers();
        headers.set('Accept-Encoding', 'identity');
        if (userAgent) {
            headers.set('User-Agent', userAgent);
        }
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await readResponseText(response);
        if (isCloudflareChallengePage(text, response)) {
            throw new Error('Upstream subscription is protected by Cloudflare challenge and cannot be fetched from Workers');
        }
        const content = decodeContent(text);
        const format = detectFormat(content);

        return { content, format, url };
    } catch (error) {
        console.error('Error fetching subscription:', error);
        throw error;
    }
}
