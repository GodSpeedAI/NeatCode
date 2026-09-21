// Rust deterministic guards — a NeatCode-owned anti-slop policy.
//
// Lipstyk (styrene-lab/lipstyk; see guards/rust/UPSTREAM.md) was consulted for
// Rust AST infrastructure ideas, but its scoring/authorship-detection framing
// is deliberately NOT adopted: NeatCode reports evidence-loss patterns, not a
// "machine-generated" score. Rules below target gaps Clippy does not own as
// policy: unchecked `unsafe`/`transmute` escape hatches, `dyn Any` evidence
// erasure, erase-then-downcast flows, broad dynamic error contracts,
// TypeId/string-driven dispatch, untyped values escaping I/O boundaries, panic
// macros in library code, and dynamic maps as domain models.
//
// Conservative by design: where a rule cannot be established from
// syntax/local evidence (e.g. whether a test seam should exist), it is left
// to the skill's judgment layer. Standard style and idiom lints stay with
// Clippy/rustfmt — nothing here duplicates them.
//
// Conventions: `SAFETY:` justification means a comment containing `SAFETY:`
// with non-empty text after the colon, on the item line or within the 5 lines
// above it. Test/example/bench files (`tests/`, `examples/`, `benches/`,
// `*_test.rs`, `test_*.rs`, `#[cfg(test)]` modules detected heuristically)
// are exempt from the library-code rules.

import { makeFinding } from './model.mjs';
import { maskSource, linesOf } from './scan.mjs';

const RUST_RULE_PREFIX = 'neatcode/rust';

const safetyRe = /SAFETY\s*:\s*\S/;

function isTestAdjacent(path) {
  return (
    /(^|\/)(tests|examples|benches|testdata)\//.test(path) ||
    /_test\.rs$/.test(path) ||
    /(^|\/)test_/.test(path)
  );
}

function hasSafety(origLines, idx, window = 5) {
  if (safetyRe.test(origLines[idx] ?? '')) return true;
  for (let j = idx - 1; j >= Math.max(0, idx - window); j -= 1) {
    if (safetyRe.test(origLines[j])) return true;
  }
  return false;
}

export function analyzeRust({ path, source }) {
  const findings = [];
  const failures = [];
  const testAdjacent = isTestAdjacent(path);
  let masked;
  try {
    masked = maskSource(source, { templates: false });
  } catch (error) {
    failures.push({ language: 'rust', path, reason: 'parse-failed', detail: error.message });
    return { findings, failures };
  }
  const lines = linesOf(source);
  const maskedLines = linesOf(masked);

  const report = (slug, family, line, column, message, severity = 'warning') => {
    findings.push(
      makeFinding({
        ruleId: `${RUST_RULE_PREFIX}/${slug}`,
        family,
        upstreamRuleId: null,
        language: 'rust',
        path,
        line,
        column,
        message,
        severity,
        source: 'neatcode',
      }),
    );
  };

  // R01: unsafe without a SAFETY invariant.
  {
    const unsafeRe = /\bunsafe\s*(?:\{|fn\b|impl\b|trait\b|extern\b)/g;
    maskedLines.forEach((line, i) => {
      unsafeRe.lastIndex = 0;
      let m;
      while ((m = unsafeRe.exec(line)) !== null) {
        if (hasSafety(lines, i)) continue;
        report(
          'unsafe-without-safety-comment',
          'unjustified-escape-hatch',
          i + 1,
          m.index + 1,
          'This `unsafe` block/item states no `SAFETY:` invariant. Name the property the author ' +
            'checked that makes the operation sound, in a comment on or above these lines.',
          'error',
        );
      }
    });
  }

  // R02: dyn Any evidence erasure.
  {
    const anyRe = /\bdyn\s+Any\b/g;
    maskedLines.forEach((line, i) => {
      anyRe.lastIndex = 0;
      let m;
      while ((m = anyRe.exec(line)) !== null) {
        report(
          'dyn-any-erasure',
          'evidence-erasure',
          i + 1,
          m.index + 1,
          '`dyn Any` erases the concrete type with no recorded reason. Prefer an enum or a trait ' +
            'contract that keeps what the author already knew.',
        );
      }
    });
  }

  // R03: erase-then-downcast recovery.
  {
    const downcastRe = /\.\s*downcast(?:_ref|_mut)?\s*::\s*<\s*([^>]+?)\s*>\s*\(\s*\)/g;
    const isRe = /\.\s*is\s*::\s*<\s*[^>]+?\s*>\s*\(\s*\)/g;
    maskedLines.forEach((line, i) => {
      downcastRe.lastIndex = 0;
      isRe.lastIndex = 0;
      let m;
      while ((m = downcastRe.exec(line)) !== null) {
        report(
          'erase-then-downcast',
          'type-laundering',
          i + 1,
          m.index + 1,
          `Downcast to \`${m[1].trim()}\` recovers evidence an earlier erasure discarded. Keep the ` +
            'concrete type (or an enum) from construction through use instead of erasing and re-guessing.',
        );
      }
      while ((m = isRe.exec(line)) !== null) {
        report(
          'erase-then-downcast',
          'type-laundering',
          i + 1,
          m.index + 1,
          'Runtime type query on erased evidence. Model the variants as an enum so the compiler ' +
            'checks exhaustiveness instead.',
        );
      }
    });
  }

  // R04: broad dynamic error contracts in library code (parameters and returns).
  // A line counts as signature context from a `fn` starter until the line
  // carrying the body `{` (or `;` for declarations), covering multi-line signatures.
  if (!testAdjacent && !/(^|\/)main\.rs$/.test(path)) {
    const errRe =
      /(Box\s*<\s*dyn\s+(?:std::)?(?:error::)?Error[^>]*>|anyhow::Error|eyre::Report)/g;
    let inSig = false;
    maskedLines.forEach((line, i) => {
      if (/^\s*(?:pub\s+|async\s+|unsafe\s+|extern\s+|const\s+)*fn\b/.test(line)) inSig = true;
      if (inSig) {
        errRe.lastIndex = 0;
        let m;
        while ((m = errRe.exec(line)) !== null) {
          report(
            'broad-dynamic-error',
            'broad-untyped-contract',
            i + 1,
            m.index + 1,
            `\`${m[1].replace(/\s+/g, ' ').trim()}\` as an error contract hides the failure domain from callers. In library ` +
              'code, return a local error enum so callers can match on meaning, not on message text.',
          );
        }
        if (line.includes('{') || line.trimEnd().endsWith(';')) inSig = false;
      }
    });
  }

  // R05: TypeId-driven dispatch.
  {
    const typeIdRe = /\bTypeId\s*::\s*of\s*::/g;
    maskedLines.forEach((line, i) => {
      typeIdRe.lastIndex = 0;
      let m;
      while ((m = typeIdRe.exec(line)) !== null) {
        report(
          'typeid-driven-dispatch',
          'dynamic-dispatch',
          i + 1,
          m.index + 1,
          '`TypeId::of` branching replaces a static contract with runtime identity checks. Prefer an ' +
            'enum or a trait method so the dispatch is visible to the type checker.',
        );
      }
    });
  }

  // R06: serde_json::Value escaping an I/O boundary (signatures and fields).
  if (!testAdjacent) {
    const valueRe = /serde_json\s*::\s*Value\b/g;
    maskedLines.forEach((line, i) => {
      valueRe.lastIndex = 0;
      let m;
      while ((m = valueRe.exec(line)) !== null) {
        // Local `let` bindings that parse inside a function body are the correct
        // shape (decode at the boundary): a local never escapes outward by itself.
        // Signatures, fields, and aliases are the violations.
        if (/^\s*let\b/.test(line)) continue;
        report(
          'untyped-value-escapes-boundary',
          'boundary-not-parsed',
          i + 1,
          m.index + 1,
          '`serde_json::Value` in a signature, field, or alias carries untyped data past the ' +
            'decoding boundary. Parse once into a named type with Serialize/Deserialize.',
        );
      }
    });
  }

  // R07: panic macros in library code.
  if (!testAdjacent) {
    const panicRe = /\b(panic|todo|unimplemented)\s*!\s*(\(|\[|\{)/g;
    maskedLines.forEach((line, i) => {
      panicRe.lastIndex = 0;
      let m;
      while ((m = panicRe.exec(line)) !== null) {
        if (hasSafety(lines, i, 2)) continue;
        const macro = m[1];
        const fix =
          macro === 'todo'
            ? 'Finish the implementation or return an error; a `todo!` in a library is an unfinished API.'
            : macro === 'unimplemented'
              ? 'Cover the case or return an error; `unimplemented!` stops every caller\'s process.'
              : 'Return a `Result` so the caller decides; a library `panic!` stops somebody else\'s process.';
        report(
          'panic-macro-in-library',
          'incomplete-failure-handling',
          i + 1,
          m.index + 1,
          `\`${macro}!\` in non-test code. ${fix}`,
          'error',
        );
      }
    });
  }

  // R09: dynamic maps as domain models (struct fields).
  {
    const mapFieldRe =
      /:\s*(?:std::collections::)?HashMap\s*<\s*String\s*,\s*(serde_json\s*::\s*Value|Box\s*<\s*dyn\s+Any\s*>|Box\s*<\s*dyn\s+[^>]*>)\s*>/g;
    maskedLines.forEach((line, i) => {
      mapFieldRe.lastIndex = 0;
      let m;
      while ((m = mapFieldRe.exec(line)) !== null) {
        report(
          'dynamic-map-domain-model',
          'broad-untyped-contract',
          i + 1,
          m.index + 1,
          `Field typed \`HashMap<String, ${m[1].replace(/\s+/g, ' ').trim()}>\` models the domain ` +
            'with dynamic values. Name the value type so the structure is checked, not re-discovered.',
        );
      }
    });
  }

  // R10: transmute without a SAFETY invariant.
  {
    const transmuteRe = /\btransmute\s*(?:::\s*<[^>]*>)?\s*\(/g;
    maskedLines.forEach((line, i) => {
      transmuteRe.lastIndex = 0;
      let m;
      while ((m = transmuteRe.exec(line)) !== null) {
        if (hasSafety(lines, i)) continue;
        report(
          'transmute-without-safety-comment',
          'unjustified-escape-hatch',
          i + 1,
          m.index + 1,
          '`transmute` reinterprets memory with no checked precondition. State the layout invariant ' +
            '(`SAFETY:`) that makes this sound, or use a checked conversion.',
          'error',
        );
      }
    });
  }

  return { findings, failures };
}

export const RUST_EXTENSIONS = ['.rs'];
