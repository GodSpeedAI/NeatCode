// JavaScript/TypeScript deterministic guards.
//
// Adapted from dmmulroy/anti-slop (oxlint plugin; see
// guards/js-ts/UPSTREAM.md). The upstream analyzers run on a full TypeScript
// AST with scope resolution, which NeatCode's zero-dependency harness cannot
// host. These detectors implement the same rule contracts over masked source
// (see lib/guards/scan.mjs) and stay conservative where syntax alone cannot
// prove the pattern:
//
// - no-object-parameters: only the literal `object` keyword, not aliases that
//   resolve to `object` (upstream resolves aliases via scope analysis).
// - no-widen-then-assert: only same-function const flows with a syntactically
//   known initializer; cross-function and reassigned bindings are left to the
//   skill's judgment.
// - require-safety-comment: a `SAFETY:` marker on the assertion line or in the
//   5 lines above it justifies; upstream walks the AST owner chain instead.
// - no-unknown-parameters/returns: syntactic annotation shapes only; generic
//   inference and type-argument positions are out of scope.
//
// Skipped upstream rules and why: require-readable-spacing (pure formatting —
// NeatCode leaves style to style tools), no-array-filter-map and
// no-reduce-accumulator-copy (performance idioms, not evidence loss),
// no-conditional-empty-object-spread (harmless idiom), effect/* (rules for the
// Effect library specifically, not general engineering patterns).

import { makeFinding } from './model.mjs';
import { maskSource, linesOf, braceDepths, functionRanges, anyLineMatches } from './scan.mjs';

const JS_RULE_PREFIX = 'neatcode/js';

const FN_START =
  /\bfunction\b.*\{|=>\s*\{|\)\s*:\s*[\w<>\[\].|& ]+\s*\{|\b(?:get|set)\s+\w+\s*\([^)]*\)\s*\{/;

const KNOWN_INIT =
  /^(?:\{|\[|new\s+\w|['"`]|`|-?\d|true|false|null|undefined|\(|(?:[\w$.]+\s+as\s+[\w<>\[\].|&]+))/;

function isBroadType(t) {
  return /^(unknown|any)$/.test(t.trim());
}

function isNarrowAssertion(t) {
  const clean = t.trim().replace(/^\(|\)$/g, '');
  return clean && !/^(unknown|any|object)$/.test(clean) && clean !== 'const';
}

export function analyzeJavaScript({ path, source, language }) {
  const findings = [];
  const masked = maskSource(source, { templates: true });
  const lines = linesOf(source);
  const maskedLines = linesOf(masked);
  const depths = braceDepths(masked);
  const owners = functionRanges(maskedLines, depths, FN_START);
  const report = (slug, family, upstream, line, column, message, severity = 'error') => {
    findings.push(
      makeFinding({
        ruleId: `${JS_RULE_PREFIX}/${slug}`,
        family,
        upstreamRuleId: upstream,
        language,
        path,
        line,
        column,
        message,
        severity,
        source: 'neatcode',
      }),
    );
  };

  // --- 1. chained assertions: `x as A as B` (TYPE-LAUNDERING) ---
  const chainedRe = /\bas\b\s*<?[\w$<>\[\].|&\s,?]+?(?:as\b)/g;
  maskedLines.forEach((line, i) => {
    chainedRe.lastIndex = 0;
    let m;
    while ((m = chainedRe.exec(line)) !== null) {
      // Exclude `as const` chains and import/export `as` (masked source keeps keywords).
      if (/\bas\s+const\b/.test(m[0])) continue;
      report(
        'no-chained-assertions',
        'type-laundering',
        'anti-slop/no-chained-type-assertions',
        i + 1,
        m.index + 1,
        'Chained type assertion discards an intermediate type and re-asserts. ' +
          'Keep the precise type from initialization through use; parse boundary input once.',
      );
    }
  });

  // --- 2. known-value widening + widen-then-assert (const flows) ---
  // `const name: unknown|any = <known>;` then later `name as Narrow`.
  // Masking preserves string lengths 1:1, so the declaration match on masked
  // source aligns with the original line — and the *original* init text is
  // what proves a known value (a masked string literal is indistinguishable
  // from an unknown identifier).
  const widenedBindings = new Map(); // name -> {line, broad, owner, evidence}
  const declRe =
    /\bconst\s+([A-Za-z_$][\w$]*)\s*:\s*(unknown|any)\b\s*=\s*(.+?);?\s*$/;
  maskedLines.forEach((line, i) => {
    const m = declRe.exec(line);
    if (!m) return;
    const om = declRe.exec(lines[i]);
    const initSrc = (om ? om[3] : m[3]).trim();
    if (!KNOWN_INIT.test(initSrc)) return;
    const [, name, broad] = m;
    widenedBindings.set(name, { line: i + 1, broad, owner: owners[i], narrow: null });
    report(
      'no-known-value-widening',
      'known-value-widening',
      'anti-slop/no-known-value-widening',
      i + 1,
      m.index + 1,
      `Binding "${name}" widens a syntactically known value to \`${broad}\`. ` +
        'Keep the precise type from initialization through use.',
    );
  });
  const useRe = /\b([A-Za-z_$][\w$]*)\s+as\s+(?!const\b)/g;
  // Capture the asserted type: either a balanced { ... } object type or a token run.
  const captureAsserted = (line, from) => {
    let j = from;
    while (j < line.length && /\s/.test(line[j])) j += 1;
    if (line[j] === '{') {
      let depth = 0;
      let k = j;
      while (k < line.length) {
        if (line[k] === '{') depth += 1;
        else if (line[k] === '}') {
          depth -= 1;
          if (depth === 0) return line.slice(j, k + 1);
        }
        k += 1;
      }
      return null;
    }
    const m = /^[\w$<>\[\].|&\s]+?[\w$<>\[\]]/.exec(line.slice(j));
    return m ? m[0] : null;
  };
  maskedLines.forEach((line, i) => {
    useRe.lastIndex = 0;
    let m;
    while ((m = useRe.exec(line)) !== null) {
      const [, name] = m;
      const asserted = captureAsserted(line, m.index + m[0].length);
      if (!asserted) continue;
      const binding = widenedBindings.get(name);
      if (!binding) continue;
      if (i + 1 <= binding.line) continue;
      if (owners[i] !== binding.owner) continue;
      if (!isNarrowAssertion(asserted)) continue;
      report(
        'no-widen-then-assert',
        'type-laundering',
        'anti-slop/no-widen-then-assert',
        i + 1,
        m.index + 1,
        `Binding "${name}" discards type evidence (line ${binding.line}) and recreates it ` +
          `with an assertion to \`${asserted.trim()}\`. Keep the precise type; parse boundary input once.`,
      );
    }
  });

  // --- 3. unknown/any/object parameters ---
  const paramRe = /[(,]\s*(\??[A-Za-z_$][\w$?]*)\s*:\s*(unknown|any|object)\b/g;
  maskedLines.forEach((line, i) => {
    // Skip arrow-function return positions and mapped types heuristically: the
    // match must sit inside parens, which the leading [(,] already ensures.
    paramRe.lastIndex = 0;
    let m;
    while ((m = paramRe.exec(line)) !== null) {
      const [, name, type] = m;
      const slug = type === 'object' ? 'no-object-parameters' : 'no-unknown-parameters';
      const upstream =
        type === 'object'
          ? 'anti-slop/no-object-parameters'
          : 'anti-slop/no-unknown-parameters';
      report(
        slug,
        'broad-untyped-contract',
        upstream,
        i + 1,
        m.index + 1,
        `Parameter \`${name}\` uses the broad \`${type}\` type. Accept a named owner type; ` +
          'parse external input at its boundary before calling this function.',
      );
    }
  });

  // --- 4. unknown/any returns ---
  const returnRe = /\)\s*:\s*(Promise\s*<\s*)?(unknown|any)\b/g;
  maskedLines.forEach((line, i) => {
    returnRe.lastIndex = 0;
    let m;
    while ((m = returnRe.exec(line)) !== null) {
      report(
        'no-unknown-returns',
        'broad-untyped-contract',
        'anti-slop/no-unknown-returns',
        i + 1,
        m.index + 1,
        `Return contract is the broad \`${m[2]}\` type. Return a named owner type so callers ` +
          'keep the evidence this function already had.',
      );
    }
  });

  // --- 5. unknown/any aliases ---
  const aliasRe = /^\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*=\s*(unknown|any)\b/;
  maskedLines.forEach((line, i) => {
    const m = aliasRe.exec(line);
    if (!m) return;
    report(
      'no-unknown-type-aliases',
      'broad-untyped-contract',
      'anti-slop/no-unknown-type-aliases',
      i + 1,
      m.index + 1,
      `Type alias \`${m[1]}\` resolves to \`${m[2]}\`. Keep the broad type visible at the ` +
        'boundary instead of naming it.',
    );
  });

  // --- 6. unsafe dictionary types: Record<string, unknown|any>, index signatures ---
  const dictRe =
    /\bRecord\s*<\s*(?:string|number|symbol|PropertyKey)(?:\s*\|\s*(?:string|number|symbol|PropertyKey))*\s*,\s*(unknown|any)\s*>/g;
  const indexRe = /\[\s*\w+\s*:\s*string\s*\]\s*:\s*(unknown|any)\b/g;
  maskedLines.forEach((line, i) => {
    dictRe.lastIndex = 0;
    indexRe.lastIndex = 0;
    let m;
    while ((m = dictRe.exec(line)) !== null) {
      report(
        'no-unsafe-dictionary-type',
        'broad-untyped-contract',
        'anti-slop/no-unsafe-dictionary-type',
        i + 1,
        m.index + 1,
        `Dictionary contract with \`${m[1]}\` values describes nothing about its contents. ` +
          'Use a named type with known fields; parse dynamic input at its boundary.',
      );
    }
    while ((m = indexRe.exec(line)) !== null) {
      report(
        'no-unsafe-dictionary-type',
        'broad-untyped-contract',
        'anti-slop/no-unsafe-dictionary-type',
        i + 1,
        m.index + 1,
        `Index-signature contract with \`${m[1]}\` values describes nothing about its contents. ` +
          'Use a named type with known fields.',
      );
    }
  });

  // --- 7. runtime typeof recovery of widened evidence ---
  // Conservative port: a bare `typeof` check only proves evidence loss when
  // the operand is a binding this same function explicitly widened (tracked
  // above). General typeof-narrowing of parameters or unknown input is
  // idiomatic TypeScript and is left to the skill's judgment — flagging it
  // from syntax alone produced only false positives on real code.
  // String literals are blanked in masked source, so match the original lines
  // and skip full-line comments (a comment cannot be a typeof check).
  const typeofRe = /\btypeof\s+([A-Za-z_$][\w$]*)\s*(?:===|!==|==|!=)\s*(['"`][\w$]+['"`])/g;
  lines.forEach((line, i) => {
    if (/^\s*\/\//.test(line)) return;
    typeofRe.lastIndex = 0;
    let m;
    while ((m = typeofRe.exec(line)) !== null) {
      const binding = widenedBindings.get(m[1]);
      if (!binding || owners[i] !== binding.owner) continue;
      report(
        'no-runtime-typeof',
        'runtime-type-recovery',
        'anti-slop/no-runtime-typeof',
        i + 1,
        m.index + 1,
        `Runtime \`typeof\` check on "${m[1]}" recovers evidence widened away at line ` +
          `${binding.line}. Decode the value into a meaningful type at the I/O boundary instead.`,
        'warning',
      );
    }
  });

  // --- 8. Reflect.get / Reflect.apply ---
  const reflectRe = /\bReflect\s*\.\s*(get|apply|set|construct|defineProperty)\s*\(/g;
  maskedLines.forEach((line, i) => {
    reflectRe.lastIndex = 0;
    let m;
    while ((m = reflectRe.exec(line)) !== null) {
      const upstream =
        m[1] === 'apply' ? 'anti-slop/no-reflect-apply' : 'anti-slop/no-reflect-get';
      report(
        m[1] === 'apply' ? 'no-reflect-apply' : 'no-reflect-get',
        'dynamic-dispatch',
        upstream,
        i + 1,
        m.index + 1,
        `\`Reflect.${m[1]}\` performs dynamic dispatch the type checker cannot see. Call the ` +
          'typed target directly or model the dispatch behind a named interface.',
      );
    }
  });

  // --- 9. module mocking in tests ---
  const mockRe = /\b(?:jest|vi)\s*\.\s*(mock|unstable_mockModule)\s*\(/g;
  maskedLines.forEach((line, i) => {
    mockRe.lastIndex = 0;
    let m;
    while ((m = mockRe.exec(line)) !== null) {
      report(
        'no-module-mocking',
        'dependency-substitution',
        'anti-slop/no-module-mocking',
        i + 1,
        m.index + 1,
        'Module mocking rewires the dependency instead of replacing it through a real interface. ' +
          'Inject the dependency or test against the real boundary.',
      );
    }
  });

  // --- 10. assertions without a SAFETY justification ---
  const assertRe = /\b([A-Za-z_$][\w$.<>[\]]*)\s+as\s+(?!const\b)/g;
  const safetyRe = /SAFETY\s*:\s*\S/;
  maskedLines.forEach((line, i) => {
    assertRe.lastIndex = 0;
    let m;
    while ((m = assertRe.exec(line)) !== null) {
      const asserted = captureAsserted(line, m.index + m[0].length);
      if (!asserted || !isNarrowAssertion(asserted)) continue;
      // Same-line marker justifies; otherwise scan the 5 lines above.
      const sameLine = safetyRe.test(lines[i]);
      const above = !sameLine && anyLineMatches(lines, i - 5, i - 1, safetyRe);
      if (sameLine || above) continue;
      report(
        'require-safety-comment-for-type-assertion',
        'unjustified-escape-hatch',
        'anti-slop/require-safety-comment-for-type-assertion',
        i + 1,
        m.index + 1,
        'This type assertion has no `SAFETY:` justification. State the checked invariant ' +
          'immediately before the assertion or its containing statement.',
        'warning',
      );
    }
  });

  // --- 11. "shape" in declared symbol names ---
  const shapeDeclRe =
    /^\s*(?:export\s+|declare\s+|abstract\s+)*(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/;
  maskedLines.forEach((line, i) => {
    const m = shapeDeclRe.exec(line);
    if (!m || !/shape/i.test(m[1])) return;
    report(
      'no-shape-in-symbol-names',
      'stringly-typed-authority',
      'anti-slop/no-shape-in-symbol-names',
      i + 1,
      m.index + 1,
      `Rename symbol "${m[1]}" for its domain role; "shape" describes structure rather ` +
        'than ownership.',
      'warning',
    );
  });

  return { findings, failures: [] };
}

export const JS_LANGUAGE_MATCH = {
  javascript: ['.js', '.mjs', '.cjs', '.jsx'],
  typescript: ['.ts', '.mts', '.cts', '.tsx'],
};
