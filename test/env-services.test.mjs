// MCP/service discovery: multi-client dedup, scopes, transports, malformed
// configs, unknown fields, and the security invariant — secret values never
// appear in output.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discoverServices, parseTomlSubset, stripJsonComments } from '../lib/env/services.mjs';
import { redactConfig, redactEndpoint, REDACTED } from '../lib/env/redact.mjs';

const HOME = '/fake/home';
const PROJECT = '/fake/proj';

function files(map) {
  return {
    readFile: (p) => (Object.hasOwn(map, p) ? map[p] : null),
    findExe: (name) => (name === '/abs/exe' || name === 'known-bin' ? `/bin/${name}` : null),
  };
}

const CURSOR_GLOBAL = `${HOME}/.cursor/mcp.json`;
const CURSOR_PROJECT = `${PROJECT}/.cursor/mcp.json`;
const CODEX_GLOBAL = `${HOME}/.codex/config.toml`;

test('same server in two clients deduplicates with per-client provenance', (t) => {
  const { services, malformed } = discoverServices({
    home: HOME,
    project: PROJECT,
    ...files({
      [CURSOR_GLOBAL]: JSON.stringify({
        mcpServers: { fs: { command: 'known-bin', args: ['--serve'], env: { FS_TOKEN: 'secret-value-abc123' } } },
      }),
      [CURSOR_PROJECT]: JSON.stringify({
        mcpServers: { fs: { command: 'known-bin', args: ['--serve'], env: { FS_TOKEN: 'other-secret-xyz789' } } },
      }),
    }),
  });
  t.assert.equal(malformed.length, 0);
  t.assert.equal(services.length, 1);
  const [fs] = services;
  t.assert.equal(fs.name, 'fs');
  t.assert.equal(fs.kind, 'mcp');
  t.assert.deepEqual(fs.configured_by, ['cursor']);
  t.assert.deepEqual(fs.source_configs, [CURSOR_GLOBAL, CURSOR_PROJECT]);
  t.assert.equal(fs.transport, 'stdio');
  t.assert.equal(fs.executable_resolvable, true);
  // Secret values die; names survive.
  t.assert.equal(fs.config.env.FS_TOKEN, REDACTED);
  t.assert.equal(fs.credentials_present, true);
  t.assert.deepEqual(fs.credential_variables, ['FS_TOKEN']);
});

test('project and global scopes are preserved per source', (t) => {
  const { services } = discoverServices({
    home: HOME,
    project: PROJECT,
    ...files({
      [CURSOR_GLOBAL]: JSON.stringify({ mcpServers: { g: { command: '/abs/exe' } } }),
      [CURSOR_PROJECT]: JSON.stringify({ mcpServers: { p: { command: '/abs/exe' } } }),
    }),
  });
  const byName = Object.fromEntries(services.map((s) => [s.name, s.scope]));
  t.assert.equal(byName.g, 'global');
  t.assert.equal(byName.p, 'project');
});

test('stdio, remote, and incomplete transports classify correctly', (t) => {
  const { services } = discoverServices({
    home: HOME,
    project: PROJECT,
    ...files({
      [CURSOR_GLOBAL]: JSON.stringify({
        mcpServers: {
          local: { command: 'known-bin' },
          remote: { url: 'https://mcp.example.com/rpc', headers: { Authorization: 'Bearer abcdef123456' } },
          broken: { future_transport: 'quantum' },
        },
      }),
    }),
  });
  const byName = Object.fromEntries(services.map((s) => [s.name, s]));
  t.assert.equal(byName.local.transport, 'stdio');
  t.assert.equal(byName.local.executable_resolvable, true);
  t.assert.equal(byName.remote.transport, 'http');
  t.assert.equal(byName.remote.endpoint, 'https://mcp.example.com/rpc');
  t.assert.equal(byName.remote.config.headers, REDACTED);
  t.assert.equal(byName.broken.transport, 'unknown');
  t.assert.equal(byName.broken.status, 'incomplete');
});

test('codex TOML servers parse, including env secrets and oauth remotes', (t) => {
  const { services, malformed } = discoverServices({
    home: HOME,
    project: PROJECT,
    ...files({
      [CODEX_GLOBAL]: [
        '[mcp_servers.local]',
        'command = "/abs/exe"',
        'args = ["--serve"]',
        '',
        '[mcp_servers.local.env]',
        'LOCAL_TOKEN = "super-secret-value-1"',
        '',
        '[mcp_servers.remote]',
        'url = "https://codex.example.invalid/mcp"',
        'bearer_token_env_var = "CODEX_REMOTE_TOKEN"',
      ].join('\n'),
    }),
  });
  t.assert.equal(malformed.length, 0);
  const byName = Object.fromEntries(services.map((s) => [s.name, s]));
  t.assert.equal(byName.local.transport, 'stdio');
  t.assert.equal(byName.local.config.env.LOCAL_TOKEN, REDACTED);
  t.assert.deepEqual(byName.local.credential_variables, ['LOCAL_TOKEN']);
  t.assert.equal(byName.remote.transport, 'http');
  // An env-var NAME is metadata, not a secret — it survives; no value leaks.
  t.assert.deepEqual(byName.remote.credential_variables, ['CODEX_REMOTE_TOKEN']);
  t.assert.ok(!JSON.stringify(byName.remote).includes('super-secret'));
});

test('missing executables, malformed configs, and unknown fields do not crash', (t) => {
  const BAD = `${HOME}/.codex/config.toml`;
  const { services, malformed } = discoverServices({
    home: HOME,
    project: PROJECT,
    ...files({
      [CURSOR_GLOBAL]: JSON.stringify({
        mcpServers: {
          ghost: { command: '/no/such/binary', args: ['x'], futureOption: { enabled: true } },
        },
      }),
      [BAD]: 'this is [not valid {{{ toml',
    }),
  });
  const ghost = services.find((s) => s.name === 'ghost');
  t.assert.ok(ghost, 'unknown fields do not drop the server');
  t.assert.equal(ghost.executable_resolvable, false);
  t.assert.equal(malformed.length, 1);
  t.assert.equal(malformed[0].client, 'codex');
});

test('TOML subset parser accepts the shapes codex uses', (t) => {
  const parsed = parseTomlSubset([
    'model = "x"',
    '[mcp_servers.a]',
    'command = "/bin/a"',
    'enabled = false',
    'args = ["--a", "--b"]',
    '[mcp_servers.b]',
    'url = "https://h/mcp"',
    '[projects."/mnt/c/Users/x"]',
    'trust_level = "trusted"',
  ].join('\n'));
  t.assert.equal(parsed.mcp_servers.a.command, '/bin/a');
  t.assert.equal(parsed.mcp_servers.a.enabled, false);
  t.assert.deepEqual(parsed.mcp_servers.a.args, ['--a', '--b']);
  t.assert.equal(parsed.projects['/mnt/c/Users/x'].trust_level, 'trusted');
  const arrays = parseTomlSubset(['[[skills.config]]', 'name = "a"', '[[skills.config]]', 'name = "b"'].join('\n'));
  t.assert.deepEqual(
    arrays.skills.config.map((s) => s.name),
    ['a', 'b'],
  );
  t.assert.throws(() => parseTomlSubset('key = some_bare_word'), /unsupported TOML value/);
});

test('zed context_servers and roo project configs parse', (t) => {
  const { services } = discoverServices({
    home: HOME,
    project: PROJECT,
    ...files({
      [`${HOME}/.config/zed/settings.json`]: JSON.stringify({
        context_servers: { local: { command: 'known-bin', args: ['--x'], env: {} } },
      }),
      [`${PROJECT}/.roo/mcp.json`]: JSON.stringify({
        mcpServers: { remote: { url: 'https://roo.example.com/mcp' } },
      }),
    }),
  });
  const byName = Object.fromEntries(services.map((s) => [s.name, s]));
  t.assert.equal(byName.local.transport, 'stdio');
  t.assert.deepEqual(byName.local.configured_by, ['zed']);
  t.assert.equal(byName.remote.transport, 'http');
  t.assert.equal(byName.remote.scope, 'project');
});

test('opencode array commands split into binary plus args', (t) => {
  const { services } = discoverServices({
    home: HOME,
    project: PROJECT,
    ...files({
      [`${HOME}/.config/opencode/opencode.json`]: JSON.stringify({
        mcp: { local: { type: 'local', command: ['/bin/tool', 'mcp', '--x'], enabled: true } },
      }),
    }),
  });
  const local = services.find((s) => s.name === 'local');
  t.assert.ok(local, 'array-command server discovered');
  t.assert.equal(local.transport, 'stdio');
  t.assert.equal(local.command, '/bin/tool');
  t.assert.deepEqual(local.args, ['mcp', '--x']);
});

test('binary paths are not secret-shaped', (t) => {
  const { redacted } = redactConfig({ command: '/home/user/.jolli/run-cli' });
  t.assert.equal(redacted.command, '/home/user/.jolli/run-cli');
});

test('JSONC comments strip; endpoints lose userinfo', (t) => {
  const stripped = stripJsonComments('{\n// comment\n"a": 1, /* x */ "b": "x//y"\n}');
  t.assert.deepEqual(JSON.parse(stripped), { a: 1, b: 'x//y' });
  t.assert.equal(redactEndpoint('https://user:s3cret@example.com/mcp'), `https://${REDACTED}@example.com/mcp`);
});

test('redaction: secret keys, secret shapes, and references', (t) => {
  const { redacted, credentialsPresent, credentialVariables } = redactConfig({
    command: '/bin/safe',
    apiKey: 'abcdef1234567890abcdef',
    nested: { password: 'hunter2-hunter2' },
    plain: 'hello',
    ref: '${MY_TOKEN}',
  });
  t.assert.equal(redacted.apiKey, REDACTED);
  t.assert.equal(redacted.nested.password, REDACTED);
  t.assert.equal(redacted.plain, 'hello');
  t.assert.equal(redacted.command, '/bin/safe');
  t.assert.equal(redacted.ref, '${MY_TOKEN}', 'references are metadata, not secrets');
  t.assert.equal(credentialsPresent, true);
  t.assert.ok(credentialVariables.includes('MY_TOKEN'));
  // Nothing secret-shaped survives anywhere in the serialized form.
  const serialized = JSON.stringify({ redacted, credentialVariables });
  t.assert.ok(!serialized.includes('abcdef1234567890abcdef'));
  t.assert.ok(!serialized.includes('hunter2-hunter2'));
});
