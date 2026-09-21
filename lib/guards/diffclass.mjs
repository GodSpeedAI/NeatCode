// Diff-relative classification of guard findings.
//
// Reuses NeatCode's finding provenance vocabulary (see
// skills/neatcode/references/findings.md): introduced · worsened · exposed ·
// pre-existing · resolved. A guard finding is evidence; this module only says
// what the change did to deterministic findings, never what it means.
//
// Rules (all deterministic, line-based):
// - introduced: on an added line, and the same rule never fired in this file before.
// - worsened: on an added line while the rule already fired in this file — the
//   file carries more of the same failure than it did.
// - exposed: not on an added line, in a file the diff touches, with no prior
//   same-rule finding in that file (revealed, not caused).
// - pre-existing: not on an added line, same rule fired in this file before.
// - resolved: fired in the baseline for a file and fires nowhere in it now.

export function classifyFindings({ findings, baselineCounts, addedLines, touchedFiles }) {
  const key = (ruleId, path) => `${ruleId}||${path}`;
  const currentCounts = new Map();
  for (const f of findings) {
    const k = key(f.rule_id, f.path);
    currentCounts.set(k, (currentCounts.get(k) ?? 0) + 1);
  }

  const classified = findings.map((f) => {
    const added = addedLines.get(f.path)?.has(f.line) ?? false;
    const base = baselineCounts.get(key(f.rule_id, f.path)) ?? 0;
    const now = currentCounts.get(key(f.rule_id, f.path)) ?? 0;
    let provenance;
    if (added && base === 0) provenance = 'introduced';
    else if (added && now > base) provenance = 'worsened';
    else if (added) provenance = 'pre-existing';
    else if (touchedFiles.has(f.path) && base === 0) provenance = 'exposed';
    else provenance = 'pre-existing';
    return { ...f, provenance };
  });

  const resolved = [];
  for (const [k, base] of baselineCounts) {
    if ((currentCounts.get(k) ?? 0) === 0) {
      const [rule_id, path] = k.split('||');
      resolved.push({ rule_id, path, baseline_count: base });
    }
  }

  const counts = { introduced: 0, worsened: 0, exposed: 0, preExisting: 0, resolved: resolved.length };
  for (const f of classified) {
    if (f.provenance === 'introduced') counts.introduced += 1;
    else if (f.provenance === 'worsened') counts.worsened += 1;
    else if (f.provenance === 'exposed') counts.exposed += 1;
    else counts.preExisting += 1;
  }
  return { classified, resolved, counts };
}

/** Baseline count map from a finding list: key rule_id||path -> count. */
export function countByRuleAndPath(findings) {
  const map = new Map();
  for (const f of findings) {
    const k = `${f.rule_id}||${f.path}`;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}
