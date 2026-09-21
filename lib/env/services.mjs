// MCP / agent-service inventory: which services are configured, by whom.
//
// Reads the MCP configuration files of supported clients (locations curated
// in lib/env/registry.mjs with mcp-sync/public-docs provenance), parses the
// known formats (JSON incl. JSONC for opencode, a TOML subset for Codex),
// normalizes each server into one service model, deduplicates the same
// logical service across clients, and redacts every secret value.
//
// Configuration files are untrusted data: malformed files are recorded as
// malformed, unknown fields never crash discovery, and secret-bearing values
// pass through lib/env/redact.mjs before anything is returned.

import { existsSync, readFileSync } from 'node:fs';
import { AGENT_KNOWLEDGE, resolvePlaceholders, templateContext } from './registry.mjs';
import { redactConfig, redactEndpoint, REDACTED } from './redact.mjs';

/** Strip // and slash-star comments outside strings (JSONC support). */
export function stripJsonComments(text) {
  let out = '';
  let i = 0;
  const n = text.length;
  let inString = false;
  while (i < n) {
    const ch = text[i];
    if (inString) {
      out += ch;
      if (ch === '\\') {
        out += text[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (ch === '"') inString = false;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === '/' && text[i + 1] === '/') {
      while (i < n && text[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function parseJsonConfig(text, path) {
  try {
    return { value: JSON.parse(stripJsonComments(text)), malformed: null };
  } catch (error) {
    return { value: null, malformed: `invalid JSON in ${path}: ${error.message.slice(0, 160)}` };
  }
}

/**
 * Minimal TOML-subset parser — only what MCP discovery needs: [table] and
 * [table.name] headers, dotted keys, strings (basic + literal), integers,
 * booleans, arrays of those, and inline tables. Anything else is a malformed
 * file, never a crash and never an invented value.
 */
export function parseTomlSubset(text) {
  const root = {};
  let current = root;
  let currentPath = [];
  const lines = text.split('\n');

  const setPath = (path) => {
    current = root;
    currentPath = path;
    for (const key of path) {
      if (typeof current[key] !== 'object' || current[key] === null || Array.isArray(current[key])) {
        current[key] = {};
      }
      current = current[key];
    }
  };

  // Split a table header into segments, respecting quoted parts.
  const splitHeader = (header) => {
    const parts = [];
    const segRe = /"([^"]*)"|'([^']*)'|([^.]+)/g;
    let seg;
    while ((seg = segRe.exec(header)) !== null) {
      const value = (seg[1] ?? seg[2] ?? seg[3] ?? '').trim();
      if (value) parts.push(value);
    }
    return parts;
  };

  const parseValue = (raw) => {
    const s = raw.trim();
    if ((s.startsWith('"') && s.endsWith('"') && s.length >= 2) || (s.startsWith("'") && s.endsWith("'") && s.length >= 2)) {
      const quote = s[0];
      let out = '';
      for (let i = 1; i < s.length - 1; i += 1) {
        if (quote === '"' && s[i] === '\\' && i + 1 < s.length - 1) {
          const esc = s[i + 1];
          out += esc === 'n' ? '\n' : esc === 't' ? '\t' : esc;
          i += 1;
        } else {
          out += s[i];
        }
      }
      return out;
    }
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (/^-?\d+$/.test(s)) return Number(s);
    if (s.startsWith('[') && s.endsWith(']')) {
      const inner = s.slice(1, -1).trim();
      if (!inner) return [];
      return splitTopLevel(inner).map((part) => parseValue(part));
    }
    if (s.startsWith('{') && s.endsWith('}')) {
      const obj = {};
      const inner = s.slice(1, -1).trim();
      if (inner) {
        for (const part of splitTopLevel(inner)) {
          const eq = part.indexOf('=');
          if (eq === -1) throw new Error(`bad inline table entry: ${part.slice(0, 40)}`);
          obj[part.slice(0, eq).trim()] = parseValue(part.slice(eq + 1));
        }
      }
      return obj;
    }
    throw new Error(`unsupported TOML value: ${s.slice(0, 40)}`);
  };

  const splitTopLevel = (s) => {
    const parts = [];
    let depth = 0;
    let inStr = null;
    let start = 0;
    for (let i = 0; i < s.length; i += 1) {
      const ch = s[i];
      if (inStr) {
        if (ch === '\\') i += 1;
        else if (ch === inStr) inStr = null;
      } else if (ch === '"' || ch === "'") {
        inStr = ch;
      } else if (ch === '[' || ch === '{') {
        depth += 1;
      } else if (ch === ']' || ch === '}') {
        depth -= 1;
      } else if (ch === ',' && depth === 0) {
        parts.push(s.slice(start, i));
        start = i + 1;
      }
    }
    parts.push(s.slice(start));
    return parts.map((p) => p.trim()).filter((p) => p.length);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const arrayTableMatch = /^\[\[([^\]]+)\]\]$/.exec(line);
    if (arrayTableMatch) {
      const parts = splitHeader(arrayTableMatch[1]);
      const leaf = parts.pop();
      let obj = root;
      for (const part of parts) {
        if (typeof obj[part] !== 'object' || obj[part] === null || Array.isArray(obj[part])) {
          obj[part] = {};
        }
        obj = obj[part];
      }
      if (!Array.isArray(obj[leaf])) obj[leaf] = [];
      const entry = {};
      obj[leaf].push(entry);
      current = entry;
      currentPath = parts.concat([leaf, String(obj[leaf].length - 1)]);
      continue;
    }
    const tableMatch = /^\[([^\]]+)\]$/.exec(line);
    if (tableMatch) {
      // Headers may quote segments: [projects."/mnt/c/Users/x"].
      const parts = splitHeader(tableMatch[1]);
      if (!parts.length || parts.some((p) => !/^[A-Za-z0-9_\-/.: $]+$/.test(p))) {
        throw new Error(`bad table header: ${line.slice(0, 60)}`);
      }
      setPath(parts);
      continue;
    }
    const eq = line.indexOf('=');
    // A `key = value` line outside any table belongs to the root. Keys may
    // quote segments (codex profile names): "gpt-5.6-sol".model = "...".
    if (eq !== -1 && !line.startsWith('[')) {
      const keySrc = line.slice(0, eq).trim();
      const keyParts = [];
      const keyRe = /"([^"]*)"|'([^']*)'|([^.]+)/g;
      let kp;
      while ((kp = keyRe.exec(keySrc)) !== null) {
        const value = (kp[1] ?? kp[2] ?? kp[3] ?? '').trim();
        if (value) keyParts.push(value);
      }
      if (!keyParts.length || keyParts.some((p) => !/^[A-Za-z0-9_\-/.: $]+$/.test(p))) {
        throw new Error(`bad key: ${keySrc.slice(0, 40)}`);
      }
      const target =
        keyParts.length > 1
          ? navigate(current, keyParts)
          : { obj: current, leaf: keyParts[0] };
      target.obj[target.leaf] = parseValue(line.slice(eq + 1));
      continue;
    }
    throw new Error(`unparseable line: ${line.slice(0, 60)}`);
  }
  return root;

  function navigate(base, parts) {
    let obj = base;
    for (const part of parts.slice(0, -1)) {
      if (typeof obj[part] !== 'object' || obj[part] === null) obj[part] = {};
      obj = obj[part];
    }
    return { obj, leaf: parts[parts.length - 1] };
  }
}

function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Normalize one raw server definition into the service model (still unredacted). */
function normalizeServer(name, raw, { client, scope, sourceConfig }) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { name, skipped: true, reason: 'not an object definition' };
  }
  // opencode local servers spell command as [binary, ...args].
  let command = typeof raw.command === 'string' ? raw.command : null;
  let args = asArray(raw.args).filter((a) => typeof a === 'string');
  if (command === null && Array.isArray(raw.command)) {
    const [binary, ...rest] = raw.command.filter((a) => typeof a === 'string');
    command = binary ?? null;
    args = [...rest, ...args];
  }
  const url = typeof raw.url === 'string' ? raw.url : typeof raw.endpoint === 'string' ? raw.endpoint : null;
  const env = raw.env ?? raw.environment ?? null;
  const transport = command ? 'stdio' : url ? (/^sse:\/\//.test(url) || /\/sse(\?|$)/.test(url) ? 'sse' : 'http') : 'unknown';
  const enabled = raw.enabled === false || raw.disabled === true ? false : true;
  return {
    name,
    kind: 'mcp',
    configured_by: [client],
    scope,
    transport,
    command,
    args,
    envShape: env && typeof env === 'object' && !Array.isArray(env) ? Object.keys(env) : null,
    endpoint: url,
    executable_resolvable: null, // filled by caller (needs PATH)
    status: enabled === false ? 'disabled' : transport === 'unknown' ? 'incomplete' : 'configured',
    source_config: sourceConfig,
    _raw: raw,
  };
}

function extractServers(parsed, key) {
  const container = parsed?.[key];
  if (container === null || typeof container !== 'object' || Array.isArray(container)) return null;
  return container;
}

export function commandResolvable(command, findExe) {
  if (!command) return null;
  if (command.includes('/') || (process.platform === 'win32' && command.includes('\\'))) {
    try {
      return existsSync(command);
    } catch {
      return false;
    }
  }
  return findExe(command) !== null;
}

/**
 * Discover MCP services. Pure against injected fs for tests:
 * { home, configHome, project, readFile(path)->string|null, findExe(name)->path|null }.
 */
export function discoverServices({ home, configHome, project = null, readFile = null, findExe = null } = {}) {
  const read = readFile ?? ((p) => {
    try {
      return existsSync(p) ? readFileSync(p, 'utf8') : null;
    } catch {
      return null;
    }
  });
  const resolveExe = findExe ?? (() => null);
  const tctx = templateContext({ home, configHome, project });
  const services = [];
  const malformed = [];

  for (const [client, knowledge] of Object.entries(AGENT_KNOWLEDGE)) {
    for (const desc of knowledge.mcp ?? []) {
      if (desc.platform && desc.platform !== tctx.platform) continue;
      const abs = resolvePlaceholders(desc.path, tctx);
      if (abs.includes('{project}')) continue; // no project root: project-scoped files are unreadable
      let text;
      try {
        text = read(abs);
      } catch {
        continue;
      }
      if (text == null) continue;
      let parsed;
      if (desc.format === 'toml') {
        try {
          parsed = parseTomlSubset(text);
        } catch (error) {
          malformed.push({ client, source_config: abs, detail: error.message.slice(0, 200) });
          continue;
        }
      } else {
        const { value, malformed: bad } = parseJsonConfig(text, abs);
        if (bad) {
          malformed.push({ client, source_config: abs, detail: bad });
          continue;
        }
        parsed = value;
      }
      const container = extractServers(parsed, desc.key);
      if (!container) continue; // no servers under the known key: not an error
      for (const [name, raw] of Object.entries(container)) {
        const entry = normalizeServer(name, raw, { client, scope: desc.scope, sourceConfig: abs });
        if (entry.skipped) continue;
        entry.executable_resolvable = commandResolvable(entry.command, resolveExe);
        const { redacted, credentialsPresent, credentialVariables } = redactConfig(entry._raw);
        delete entry._raw;
        entry.config = redacted;
        entry.credentials_present = credentialsPresent;
        entry.credential_variables = credentialVariables;
        if (entry.endpoint) entry.endpoint = redactEndpoint(entry.endpoint);
        services.push(entry);
      }
    }
  }

  return { services: dedupeServices(services), malformed };
}

/** Same logical service (name + command/endpoint) in several clients → one entry. */
export function dedupeServices(services) {
  const byKey = new Map();
  for (const s of services) {
    const identity = `${s.name}||${s.command ?? ''}||${s.endpoint ?? ''}`;
    const existing = byKey.get(identity);
    if (!existing) {
      byKey.set(identity, { ...s, configured_by: [...s.configured_by], source_configs: [s.source_config] });
      continue;
    }
    for (const client of s.configured_by) {
      if (!existing.configured_by.includes(client)) existing.configured_by.push(client);
    }
    if (!existing.source_configs.includes(s.source_config)) existing.source_configs.push(s.source_config);
    // Merge credential metadata conservatively (present if present anywhere).
    existing.credentials_present = existing.credentials_present || s.credentials_present;
    for (const v of s.credential_variables ?? []) {
      if (!existing.credential_variables.includes(v)) existing.credential_variables.push(v);
    }
    existing.credential_variables.sort();
  }
  const out = [...byKey.values()].map((s) => {
    const { source_config, ...rest } = s;
    return { ...rest, configured_by: [...rest.configured_by].sort() };
  });
  out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return out;
}
