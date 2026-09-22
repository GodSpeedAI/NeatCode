// Tests for registry client security, bounds, and parsing.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_REGISTRY_URL,
  MAX_REGISTRY_RESPONSE_BYTES,
  fetchPackageMetadata,
} from '../lib/update/registry.mjs';

test('enforces HTTPS for remote registry endpoints', async () => {
  await assert.rejects(
    () => fetchPackageMetadata({ registryUrl: 'http://registry.npmjs.org/@godspeedai/neatcode' }),
    /Registry URL must use HTTPS/,
  );
});

test('allows localhost / 127.0.0.1 HTTP for testing', async () => {
  const mockFetch = async () => ({
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    text: async () => JSON.stringify({
      name: '@godspeedai/neatcode',
      versions: { '1.0.0': {} },
      time: { '1.0.0': '2026-08-14T00:59:07.114Z' },
    }),
  });

  const res = await fetchPackageMetadata({
    registryUrl: 'http://localhost:8080/@godspeedai/neatcode',
    fetchImpl: mockFetch,
  });

  assert.equal(res.name, '@godspeedai/neatcode');
  assert.deepEqual(res.versions, ['1.0.0']);
  assert.equal(res.time['1.0.0'], '2026-08-14T00:59:07.114Z');
});

test('extracts server Date header to mitigate client clock skew', async () => {
  const serverTime = 'Sun, 20 Sep 2026 21:00:00 GMT';
  const mockFetch = async () => ({
    ok: true,
    headers: new Headers({
      'content-type': 'application/json',
      date: serverTime,
    }),
    text: async () => JSON.stringify({
      name: '@godspeedai/neatcode',
      versions: { '1.1.0': {} },
      time: { '1.1.0': '2026-09-03T21:19:06.799Z' },
    }),
  });

  const res = await fetchPackageMetadata({
    fetchImpl: mockFetch,
  });

  assert.ok(res.serverDate instanceof Date);
  assert.equal(res.serverDate.toISOString(), new Date(serverTime).toISOString());
});

test('rejects responses exceeding size bounds', async () => {
  const mockFetch = async () => ({
    ok: true,
    headers: new Headers({
      'content-type': 'application/json',
      'content-length': String(MAX_REGISTRY_RESPONSE_BYTES + 100),
    }),
    text: async () => 'x'.repeat(MAX_REGISTRY_RESPONSE_BYTES + 100),
  });

  await assert.rejects(
    () => fetchPackageMetadata({ fetchImpl: mockFetch }),
    /Registry response exceeded size ceiling/,
  );
});

test('handles network failure and HTTP errors gracefully', async () => {
  const mockFetchError = async () => {
    throw new Error('ECONNREFUSED');
  };

  await assert.rejects(
    () => fetchPackageMetadata({ fetchImpl: mockFetchError }),
    /Failed to contact npm registry: ECONNREFUSED/,
  );

  const mockFetch404 = async () => ({
    ok: false,
    status: 404,
    statusText: 'Not Found',
  });

  await assert.rejects(
    () => fetchPackageMetadata({ fetchImpl: mockFetch404 }),
    /Registry responded with HTTP 404: Not Found/,
  );
});

test('validates registry response structure', async () => {
  const mockInvalid = async () => ({
    ok: true,
    headers: new Headers(),
    text: async () => JSON.stringify({ notName: 'oops' }),
  });

  await assert.rejects(
    () => fetchPackageMetadata({ fetchImpl: mockInvalid }),
    /missing package name/,
  );
});
