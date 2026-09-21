// The unified NeatCode guard finding model.
//
// Every language analyzer normalizes into this shape. Upstream rule
// identifiers are preserved for traceability, but the NeatCode family and
// rule id are the primary conceptual interface.

import { isKnownFamily } from './taxonomy.mjs';

export const GUARD_SCHEMA_VERSION = 1;

/**
 * Build one normalized finding. Throws on a malformed family so a typo in a
 * rule implementation fails loudly instead of shipping an unclassified finding.
 */
export function makeFinding({
  ruleId,
  family,
  upstreamRuleId = null,
  language,
  path,
  line,
  column = null,
  endLine = null,
  message,
  severity = 'warning',
  source = 'neatcode',
}) {
  if (!isKnownFamily(family)) throw new Error(`neatcode guard: unknown family "${family}"`);
  if (!ruleId || !language || !path || !line || !message) {
    throw new Error('neatcode guard: finding requires ruleId, language, path, line, message');
  }
  if (!['error', 'warning'].includes(severity)) {
    throw new Error(`neatcode guard: unknown severity "${severity}"`);
  }
  return {
    rule_id: ruleId,
    neatcode_family: family,
    upstream_rule_id: upstreamRuleId,
    language,
    path,
    line,
    column,
    end_line: endLine,
    message,
    deterministic: true,
    severity,
    source,
  };
}

/** A machine execution failure. Distinct from findings: a failed parser or a
 * missing runtime must never be reported as a clean result. */
export function makeFailure({ language, path = null, reason, detail = null }) {
  return { language, path, reason, detail };
}

export function validateFinding(f) {
  const problems = [];
  if (typeof f?.rule_id !== 'string' || !f.rule_id) problems.push('rule_id is required');
  if (!isKnownFamily(f?.neatcode_family)) problems.push(`unknown family: ${f?.neatcode_family}`);
  if (typeof f?.language !== 'string' || !f.language) problems.push('language is required');
  if (typeof f?.path !== 'string' || !f.path) problems.push('path is required');
  if (!Number.isInteger(f?.line) || f.line < 1) problems.push('line must be a positive integer');
  if (f?.deterministic !== true) problems.push('deterministic must be true');
  return problems;
}

/** Counts the skill can read at a glance: totals plus by-family/by-rule splits. */
export function summarizeFindings(findings) {
  const byFamily = {};
  const byRule = {};
  const byLanguage = {};
  for (const f of findings) {
    byFamily[f.neatcode_family] = (byFamily[f.neatcode_family] ?? 0) + 1;
    byRule[f.rule_id] = (byRule[f.rule_id] ?? 0) + 1;
    byLanguage[f.language] = (byLanguage[f.language] ?? 0) + 1;
  }
  return { total: findings.length, byFamily, byRule, byLanguage };
}

const SEVERITY_RANK = { error: 0, warning: 1 };

export function sortFindings(findings) {
  return [...findings].sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      (a.path < b.path ? -1 : a.path > b.path ? 1 : 0) ||
      a.line - b.line ||
      (a.column ?? 0) - (b.column ?? 0),
  );
}

/** One-line human rendering used by the CLI and the envelope markdown. */
export function formatFinding(f) {
  const col = f.column != null ? `:${f.column}` : '';
  return `${f.path}:${f.line}${col} [${f.rule_id}] ${f.message}`;
}
