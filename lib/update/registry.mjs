// npm registry client for NeatCode self-update.
// Enforces HTTPS, bounds response sizes, validates response shape,
// extracts authoritative per-version publication timestamps,
// and extracts registry server time from HTTP headers.

import { parseSemver } from './semver.mjs';

export const DEFAULT_REGISTRY_URL = 'https://registry.npmjs.org/@godspeedai/neatcode';
export const MAX_REGISTRY_RESPONSE_BYTES = 5 * 1024 * 1024; // 5MB limit
export const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Fetch package metadata from npm registry.
 *
 * @param {object} [options]
 * @param {string} [options.registryUrl]
 * @param {number} [options.timeoutMs]
 * @param {typeof fetch} [options.fetchImpl]
 * @returns {Promise<{
 *   name: string,
 *   versions: string[],
 *   time: Record<string, string>,
 *   serverDate: Date | null,
 *   distTags: Record<string, string>,
 * }>}
 */
export async function fetchPackageMetadata({
  registryUrl = DEFAULT_REGISTRY_URL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
} = {}) {
  const url = new URL(registryUrl);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error(`Registry URL must use HTTPS: ${registryUrl}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetchImpl(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Registry request timed out after ${timeoutMs}ms`);
    }
    throw new Error(`Failed to contact npm registry: ${error.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Registry responded with HTTP ${response.status}: ${response.statusText}`);
  }

  // Parse server Date header if provided by the registry
  let serverDate = null;
  const dateHeader = response.headers?.get ? response.headers.get('date') : null;
  if (dateHeader) {
    const parsedDate = new Date(dateHeader);
    if (!Number.isNaN(parsedDate.getTime())) {
      serverDate = parsedDate;
    }
  }

  // Validate content length if present
  const contentLength = Number(response.headers?.get ? response.headers.get('content-length') : null);
  if (contentLength && contentLength > MAX_REGISTRY_RESPONSE_BYTES) {
    throw new Error(`Registry response exceeded size ceiling (${contentLength} > ${MAX_REGISTRY_RESPONSE_BYTES} bytes)`);
  }

  const rawText = await response.text();
  if (rawText.length > MAX_REGISTRY_RESPONSE_BYTES) {
    throw new Error(`Registry response exceeded size ceiling (${rawText.length} > ${MAX_REGISTRY_RESPONSE_BYTES} bytes)`);
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error('Malformed JSON received from registry');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid registry response: expected JSON object');
  }

  if (typeof data.name !== 'string') {
    throw new Error('Invalid registry response: missing package name');
  }

  const versionsObj = data.versions && typeof data.versions === 'object' ? data.versions : {};
  const timeObj = data.time && typeof data.time === 'object' ? data.time : {};
  const distTags = data['dist-tags'] && typeof data['dist-tags'] === 'object' ? data['dist-tags'] : {};

  // Collect valid versions that exist in the versions map
  const validVersions = [];
  for (const v of Object.keys(versionsObj)) {
    if (parseSemver(v)) {
      validVersions.push(v);
    }
  }

  // Normalize valid ISO timestamps for each version
  const validTime = {};
  for (const [v, t] of Object.entries(timeObj)) {
    if (typeof t === 'string') {
      const dt = new Date(t);
      if (!Number.isNaN(dt.getTime())) {
        validTime[v] = dt.toISOString();
      }
    }
  }

  return {
    name: data.name,
    versions: validVersions,
    time: validTime,
    serverDate,
    distTags,
  };
}
