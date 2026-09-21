// Current-executor detection: which AI coding agent is running NeatCode now.
//
// Ported from vercel/detect-agent (Apache-2.0; see lib/env/upstream/UPSTREAM.md):
// the `agents.json` spec is loaded verbatim at runtime and the condition-tree
// evaluator below mirrors `src/evaluate-condition.ts`. Two deliberate
// deviations: evaluation is synchronous (NeatCode's harness avoids async
// where a sync fs check does), and file_exists paths support a leading `~`
// (the upstream spec stores absolute paths; `~` keeps fixtures portable).
//
// This answers a different question from installed-agent discovery (see
// lib/env/detect.mjs): `installed` is about the machine, `current executor`
// is about this process.

import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

let cachedSpec = null;

export function loadExecutorSpec(specPath = join(HERE, 'upstream', 'detect-agents.json')) {
  if (specPath === join(HERE, 'upstream', 'detect-agents.json') && cachedSpec) return cachedSpec;
  const spec = JSON.parse(readFileSync(specPath, 'utf8'));
  if (specPath === join(HERE, 'upstream', 'detect-agents.json')) cachedSpec = spec;
  return spec;
}

export function evaluateCondition(condition, env = process.env) {
  if (!condition || typeof condition.type !== 'string') return false;
  switch (condition.type) {
    case 'env_set':
      return Boolean(env[condition.name]);
    case 'env_value':
      return env[condition.name] === condition.value;
    case 'env_matches': {
      const value = env[condition.name];
      if (!value) return false;
      try {
        return new RegExp(condition.pattern).test(value);
      } catch {
        // A malformed pattern in the spec must never throw at detection time.
        return false;
      }
    }
    case 'no_tty':
      return !process.stdout?.isTTY;
    case 'file_exists': {
      let p = condition.path;
      if (typeof p === 'string' && p.startsWith('~/')) {
        p = join(env.HOME ?? '', p.slice(2));
      }
      try {
        return existsSync(p);
      } catch {
        return false;
      }
    }
    case 'anyOf':
      return Array.isArray(condition.conditions) && condition.conditions.some((c) => evaluateCondition(c, env));
    case 'allOf':
      return Array.isArray(condition.conditions) && condition.conditions.every((c) => evaluateCondition(c, env));
    default:
      return false;
  }
}

/**
 * Determine the currently executing agent from environment signals.
 * Returns { isAgent, name } where name is null when no agent matches.
 * The AI_AGENT standard variable takes highest priority, verbatim.
 */
export function determineExecutor({ env = process.env, spec = null } = {}) {
  const table = spec ?? loadExecutorSpec();
  const aiAgentVar = table.aiAgentVar ?? 'AI_AGENT';
  const raw = env[aiAgentVar];
  if (raw && raw.trim()) return { isAgent: true, name: raw.trim(), via: aiAgentVar };
  for (const agent of table.agents ?? []) {
    if (evaluateCondition(agent.match, env)) {
      return { isAgent: true, name: agent.name, via: 'signal' };
    }
  }
  return { isAgent: false, name: null, via: null };
}
