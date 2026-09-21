// Go deterministic guards.
//
// Adapted from JacobJNilsson/anti-slop-go (`go/analysis` analyzers; see
// guards/go/UPSTREAM.md). The upstream analyzers use the Go type checker,
// which NeatCode's zero-dependency harness cannot host. These detectors
// implement the same rule contracts over masked source (see
// lib/guards/scan.mjs) and stay conservative where syntax alone cannot prove
// the pattern:
//
// - G01/G11 justification means ANY own-line comment directly above the
//   assertion/call or above the statement containing it (upstream: same).
// - G03 exemptions that need type resolution (interface satisfaction) are not
//   ported; the syntactic exemptions (fmt-style variadic, `cause` params,
//   CONTRACT: comments) are, plus `type A = any` alias-use resolution.
// - G05 binding shape fires only when the initializer is a composite literal
//   (genuinely known syntax); `any(x)` conversions of unknown values are
//   accepted, matching the upstream "real question" carve-out.
// - G06 cannot read the operand's static type, so it combines three signals:
//   decode-oriented files/packages exempt by path, switches on declared named
//   contracts or `error` skipped, everything else flagged.
// - G10 reads the receiver name `err` plus identifiers assigned from a call
//   and compared against nil (error-shaped evidence). A non-error value
//   meeting both conditions would misfire — the skill owns that judgment call.
// - G09 (interface returns) needs return-type resolution and is not ported.
// - G12/G14 (test-shape idioms) are too heuristic for syntax and are not
//   ported. Both decisions are recorded in guards/go/UPSTREAM.md.

import { makeFinding } from './model.mjs';
import { maskSource, linesOf } from './scan.mjs';

const GO_RULE_PREFIX = 'neatcode/go';

const isTestFile = (path) => path.endsWith('_test.go');
const isGenerated = (lines) =>
  lines.slice(0, 8).some((l) => /code generated .* do not edit/i.test(l));

function ownLineComment(text) {
  return /^\s*\/\//.test(text);
}

/** Statement start: scan back over continuation lines (max 6). */
function statementStart(lines, idx) {
  let start = idx;
  for (let n = 0; n < 6 && start > 0; n += 1) {
    const prev = lines[start - 1].trim();
    if (
      prev === '' ||
      /[;{}]$/.test(prev) ||
      /^(func|if|for|switch|select|case|default|else|go|defer|return|var|const|type|import)\b/.test(
        prev,
      )
    ) {
      break;
    }
    start -= 1;
  }
  return start;
}

/** Any own-line comment directly above the line or above its statement. */
function hasJustification(origLines, idx) {
  if (idx > 0 && ownLineComment(origLines[idx - 1])) return true;
  const start = statementStart(origLines, idx);
  if (start !== idx && start > 0 && ownLineComment(origLines[start - 1])) return true;
  return false;
}

export function analyzeGo({ path, source }) {
  const findings = [];
  const failures = [];
  const test = isTestFile(path);
  let masked;
  try {
    masked = maskSource(source, { templates: false });
  } catch (error) {
    failures.push({
      language: 'go',
      path,
      reason: 'parse-failed',
      detail: error.message,
    });
    return { findings, failures };
  }
  const lines = linesOf(source);
  const maskedLines = linesOf(masked);
  if (isGenerated(lines)) return { findings, failures };

  const report = (slug, upstream, family, line, column, message, severity = 'error') => {
    findings.push(
      makeFinding({
        ruleId: `${GO_RULE_PREFIX}/${slug}`,
        family,
        upstreamRuleId: upstream,
        language: 'go',
        path,
        line,
        column,
        message,
        severity,
        source: 'neatcode',
      }),
    );
  };

  // Type assertions. The receiver allows one index step (map/slice access —
  // string keys are blanked in masked source, so the index class admits spaces).
  const assertRe =
    /([A-Za-z_]\w*(?:\s*\[[^\]\n]*\])?(?:\s*\.\s*[A-Za-z_]\w*)*)\s*\.\(\s*([^)]*?)\s*\)/g;
  const commaOkRe = /,\s*\w+\s*:=/;
  const packageName = (() => {
    const m = /^\s*package\s+(\w+)/m.exec(masked);
    return m ? m[1] : '';
  })();
  const decodeContext = /(json|xml|yaml|toml|codec|decode|unmarshal|parse|serial)/i.test(
    `${path} ${packageName}`,
  );

  // Declared types of local identifiers (single-line signatures and `var`
  // decls): lets G06/G10 distinguish a named contract from `any` without a
  // type checker. Multi-line signatures are out of scope — unknown stays flaggable.
  const declaredTypes = new Map();
  const recordDecl = (namesSrc, typeSrc) => {
    const type = typeSrc.trim();
    if (!type) return;
    for (const name of namesSrc.split(',')) {
      const n = name.trim();
      if (/^[A-Za-z_]\w*$/.test(n) && !declaredTypes.has(n)) declaredTypes.set(n, type);
    }
  };
  const splitTopCommas = (s) => {
    const parts = [];
    let depth = 0;
    let start = 0;
    for (let k = 0; k < s.length; k += 1) {
      const ch = s[k];
      if (ch === '(' || ch === '[' || ch === '{') depth += 1;
      else if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
      else if (ch === ',' && depth === 0) {
        parts.push(s.slice(start, k));
        start = k + 1;
      }
    }
    parts.push(s.slice(start));
    return parts;
  };
  for (const line of maskedLines) {
    const sig = /^\s*func\s+(?:\([^)]*\)\s*)?[A-Za-z_]\w*\s*\(([^)]*)\)/.exec(line);
    if (sig) {
      for (const part of splitTopCommas(sig[1])) {
        const pm = /^\s*([A-Za-z_][\w\s,]*?)\s+(\.\.\.)?\s*([A-Za-z_][\w.*<>\[\]{}]*)\s*$/.exec(part);
        if (pm) recordDecl(pm[1], pm[3]);
      }
    }
    const vd = /^\s*var\s+([A-Za-z_]\w*)\s+([A-Za-z_][\w.*<>\[\]{}]*)/.exec(line);
    if (vd) recordDecl(vd[1], vd[2]);
  }

  /** Named (non-dynamic) contract, or null when the type is unknown/dynamic. */
  const namedContract = (name) => {
    const t = declaredTypes.get(name);
    if (!t) return null;
    const base = t.replace(/^\*+/, '');
    if (/^(any|interface\s*\{\s*\}|error)$/.test(base)) return null;
    if (/^(map\[|\[\]|chan\b|func\(|struct\{)/.test(base)) return null;
    return /^[A-Za-z_][\w]*(\.[A-Za-z_][\w]*)?$/.test(base) ? base : null;
  };

  // Identifiers compared against nil (`if err != nil`) are error-shaped
  // evidence: combined with an assignment from a call, this is how syntax
  // alone can know a value is an error without the type checker.
  const errorShaped = new Set(['err']);
  {
    const assignedFromCall = new Set();
    const callAssignRe = /^\s*(?:var\s+)?([A-Za-z_][\w\s,]*?)\s*(?::=|=)\s*[^=].*\(.*\)\s*$/;
    for (const line of maskedLines) {
      const a = callAssignRe.exec(line);
      if (a) {
        for (const name of a[1].split(',')) {
          const n = name.trim();
          if (/^[A-Za-z_]\w*$/.test(n)) assignedFromCall.add(n);
        }
      }
    }
    const nilCmpRe = /\b([A-Za-z_]\w*)\s*(?:==|!=)\s*nil\b|\bnil\s*(?:==|!=)\s*([A-Za-z_]\w*)/g;
    for (const line of maskedLines) {
      nilCmpRe.lastIndex = 0;
      let m;
      while ((m = nilCmpRe.exec(line)) !== null) {
        const name = m[1] ?? m[2];
        if (assignedFromCall.has(name)) errorShaped.add(name);
      }
    }
  }

  maskedLines.forEach((line, i) => {
    assertRe.lastIndex = 0;
    let m;
    while ((m = assertRe.exec(line)) !== null) {
      const [full, receiver, asserted] = m;
      if (asserted.trim() === 'type') continue; // type-switch guard: G06 owns it
      const col = m.index + 1;
      const recvBase = receiver.includes('.') ? receiver.split('.').pop().trim() : receiver.trim();

      // G10: assertion on an error value — errors.As walks the wrap chain.
      // `err` by name, or any identifier assigned from a call and compared
      // against nil (error-shaped evidence without a type checker).
      if (errorShaped.has(recvBase)) {
        report(
          'no-error-assert',
          'anti-slop-go/G10-noerrorassert',
          'runtime-type-recovery',
          i + 1,
          col,
          'Type assertion on an `err` value fails through %w wrappers. Use errors.As / errors.Is, ' +
            'which walk the wrap chain.',
        );
        continue;
      }

      // G05 chained shape: x.(any).(T) — the widening sits inside the operand.
      // (any(v).(T) is matched by the dedicated pass below.)
      if (asserted.trim() === 'any') {
        report(
          'no-laundering',
          'anti-slop-go/G05-nolaundering',
          'type-laundering',
          i + 1,
          col,
          'Value passes through `any` and comes back through an assertion. Keep the value in its own type.',
        );
        continue;
      }

      // G01: single-result assertion needs a justification comment.
      const before = line.slice(0, m.index);
      if (commaOkRe.test(before)) continue; // comma-ok form is checked code
      // Comma-ok split across `if v, ok := ...` on the same line is covered above.
      if (hasJustification(lines, i)) continue;
      report(
        'require-assertion-justification',
        'anti-slop-go/G01-safetyassert',
        'unjustified-escape-hatch',
        i + 1,
        col,
        'Type assertion has no justification comment; state the checked invariant in a comment ' +
          'directly above it, or use the comma-ok form.',
        'warning',
      );
    }
  });

  // G05 chained conversion shape: any(v).(T).
  {
    const chainedRe = /\bany\s*\([^()\n]*\)\s*\.\(\s*([^)]*?)\s*\)/g;
    maskedLines.forEach((line, i) => {
      chainedRe.lastIndex = 0;
      let m;
      while ((m = chainedRe.exec(line)) !== null) {
        if (m[1].trim() === 'type' || m[1].trim() === 'any') continue;
        report(
          'no-laundering',
          'anti-slop-go/G05-nolaundering',
          'type-laundering',
          i + 1,
          m.index + 1,
          'Value passes through `any` and comes back through an assertion. Keep the value in its own type.',
        );
      }
    });
  }

  // G05 binding shape: `var v any = Concrete{...}` then `v.(T)` in the same function.
  {
    const declRe = /^\s*var\s+([A-Za-z_]\w*)\s+any\s*=\s*(.+)$/;
    const litRe = /^(?:&\s*)?(?:[\w.]+\s*)?\{/;
    const widened = new Map();
    maskedLines.forEach((line, i) => {
      const d = declRe.exec(line);
      if (d && litRe.test(d[2].trim())) widened.set(d[1], i + 1);
    });
    if (widened.size) {
      const useRe = /\b([A-Za-z_]\w*)\.\(\s*([^)]*?)\s*\)/g;
      maskedLines.forEach((line, i) => {
        useRe.lastIndex = 0;
        let m;
        while ((m = useRe.exec(line)) !== null) {
          const declLine = widened.get(m[1]);
          if (!declLine || i + 1 <= declLine || m[2].trim() === 'type') continue;
          report(
            'no-laundering',
            'anti-slop-go/G05-nolaundering',
            'type-laundering',
            i + 1,
            m.index + 1,
            `Value "${m[1]}" widens to \`any\` (line ${declLine}) and comes back through an ` +
              'assertion. Keep the value in its own type.',
          );
        }
      });
    }
  }

  // G02: map[string]any / map[string]interface{} (defined-type decls exempt).
  // `type Alias = map[string]any` uses are reported at their use sites: the
  // alias is the same type. (A defined `type Headers map[string]any` is a
  // domain type and stays accepted.)
  {
    const mapRe = /map\s*\[\s*string\s*\]\s*(any|interface\s*\{\s*\})/g;
    const mapAliasList = [];
    for (const line of maskedLines) {
      const d = /^\s*type\s+([A-Za-z_]\w*)\s*=\s*map\s*\[\s*string\s*\]\s*(?:any|interface\s*\{\s*\})/.exec(line);
      if (d) mapAliasList.push(d[1]);
    }
    const mapAliasRe = mapAliasList.length
      ? new RegExp(`\\b(?:${mapAliasList.join('|')})\\b`, 'g')
      : null;
    maskedLines.forEach((line, i) => {
      if (/^\s*type\s+\w+\s*=\s*map\s*\[/.test(line)) return; // the alias decl itself
      mapRe.lastIndex = 0;
      let m;
      while ((m = mapRe.exec(line)) !== null) {
        if (/^\s*type\s+\w+\s+map\s*\[/.test(line)) continue; // `type Headers map[string]any` is a domain type
        report(
          'no-untyped-map',
          'anti-slop-go/G02-nountypedmap',
          'broad-untyped-contract',
          i + 1,
          m.index + 1,
          '`map[string]any` describes nothing about its keys or values. Use a named struct and ' +
            'decode into it at the boundary.',
        );
      }
      if (mapAliasRe) {
        mapAliasRe.lastIndex = 0;
        while ((m = mapAliasRe.exec(line)) !== null) {
          report(
            'no-untyped-map',
            'anti-slop-go/G02-nountypedmap',
            'broad-untyped-contract',
            i + 1,
            m.index + 1,
            `Type \`${m[0]}\` is an alias for \`map[string]any\`: invisible keys, untyped values. ` +
              'Use a named struct and decode into it at the boundary.',
          );
        }
      }
    });
  }

  // G03/G04: any params and results, including `type A = any` alias uses.
  // (A defined `type Payload any` is a domain type: its *name* never matches
  // the patterns below, so it stays accepted, matching upstream.)
  {
    const anyAliases = new Set();
    const mapAliases = new Set();
    for (const line of maskedLines) {
      let m = /^\s*type\s+([A-Za-z_]\w*)\s*=\s*(?:any|interface\s*\{\s*\})\s*;?\s*$/.exec(line);
      if (m) anyAliases.add(m[1]);
      m = /^\s*type\s+([A-Za-z_]\w*)\s*=\s*map\s*\[\s*string\s*\]\s*(?:any|interface\s*\{\s*\})/.exec(line);
      if (m) mapAliases.add(m[1]);
    }
    const aliasAlt = [...anyAliases].join('|'); // Go identifiers hold no regex metacharacters
    const anyType = aliasAlt ? `(?:any|interface\\s*\\{\\s*\\}|\\b(?:${aliasAlt})\\b)` : `(?:any|interface\\s*\\{\\s*\\})`;
    // Find enclosing `func Name(` for fmt-style detection and CONTRACT: comments.
    const funcAt = (idx) => {
      for (let j = idx; j >= Math.max(0, idx - 12); j -= 1) {
        const m = /^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)\s*\(/.exec(maskedLines[j]);
        if (m) return { name: m[1], line: j };
      }
      return null;
    };
    const anyParamRe = new RegExp(
      `[(,]\\s*([A-Za-z_]\\w*(?:\\s*,\\s*[A-Za-z_]\\w*)*)\\s+(\\.\\.\\.)?\\s*${anyType}`,
      'g',
    );
    maskedLines.forEach((line, i) => {
      anyParamRe.lastIndex = 0;
      let m;
      while ((m = anyParamRe.exec(line)) !== null) {
        const [, names, dots] = m;
        const nameList = names.split(',').map((s) => s.trim());
        if (nameList.includes('cause')) continue;
        const fn = funcAt(i);
        if (dots && fn) {
          // fmt-style helper: earlier string param named *format*, or F-ending name.
          const sigStart = maskedLines.slice(Math.max(0, fn.line), i + 1).join(' ');
          const fmtParam = /[A-Za-z_]\w*format\w*\s+string/i.test(sigStart);
          if (fmtParam || (fn.name.length > 1 && /f$/.test(fn.name))) continue;
        }
        if (fn && fn.line > 0) {
          const above = lines[fn.line - 1] ?? '';
          if (/CONTRACT\s*:/.test(above)) continue;
        }
        report(
          'no-any-param',
          'anti-slop-go/G03-noanyparam',
          'broad-untyped-contract',
          i + 1,
          m.index + 1,
          `Parameter \`${nameList.join(', ')}\` accepts every value; the callee must rediscover ` +
            'what the caller knew. Accept a named domain type or a constrained type parameter.',
          'warning',
        );
      }
    });
    const anyResultRe = new RegExp(`\\)\\s*(?:\\(\\s*[^)]*?)?\\b${anyType}`, 'g');
    maskedLines.forEach((line, i) => {
      // Result-position `any`: `) any {`, `) (x any, ...)`, `) interface{}`.
      // `any` is not a valid expression, so `)`-followed-by-`any` is signature-shaped.
      anyResultRe.lastIndex = 0;
      let m;
      while ((m = anyResultRe.exec(line)) !== null) {
        report(
          'no-any-return',
          'anti-slop-go/G04-noanyreturn',
          'broad-untyped-contract',
          i + 1,
          m.index + 1,
          'An `any` result pushes the proof obligation to every caller. Return a named domain type.',
        );
      }
    });
  }

  // G06: ad-hoc type switch. Skipped when the operand carries a named contract
  // (a narrow interface like io.Reader, not the empty interface) or an error
  // (G10's domain) — established from local declarations, not the path alone.
  if (!decodeContext) {
    const switchRe = /switch\s+(?:\w+\s*:?=\s*)?(\w[\w.]*)\.\(\s*type\s*\)/g;
    maskedLines.forEach((line, i) => {
      switchRe.lastIndex = 0;
      let m;
      while ((m = switchRe.exec(line)) !== null) {
        if (errorShaped.has(m[1])) continue; // G10 owns error switches
        const operand = m[1].includes('.') ? null : m[1];
        if (operand) {
          const decl = declaredTypes.get(operand);
          if (decl && /^(error)$/.test(decl.replace(/^\*+/, ''))) continue; // G10's domain
          if (namedContract(operand)) continue; // narrow contract, not empty interface
        }
        report(
          'no-ad-hoc-type-switch',
          'anti-slop-go/G06-noadhoctypeswitch',
          'dynamic-dispatch',
          i + 1,
          m.index + 1,
          'Type switch on a dynamic value re-parses data away from the boundary that received it. ' +
            'Branch on a domain value: a kind field, a sealed interface, or one handler per type.',
        );
      }
    });
  }

  // G07: reflect import (original lines: import paths are blanked in masked
  // source). A test file that only calls reflect.DeepEqual stays clean.
  {
    const reflectImport = lines.some((l) => /^\s*(?:[\w.]+\s+)?"reflect"/.test(l));
    if (reflectImport) {
      const useRe = /\breflect\s*\.\s*(\w+)/g;
      let m;
      const maskedAll = maskedLines.join('\n');
      let uses = 0;
      let onlyDeepEqual = true;
      while ((m = useRe.exec(maskedAll)) !== null) {
        uses += 1;
        if (m[1] !== 'DeepEqual') onlyDeepEqual = false;
      }
      if (test && uses > 0 && onlyDeepEqual) {
        // Clean by rule contract: the import exists only for DeepEqual.
      } else {
        const idx = lines.findIndex((l) => /"reflect"/.test(l));
        report(
          'no-reflect',
          'anti-slop-go/G07-noreflect',
          'dynamic-dispatch',
          idx + 1,
          1,
          'Import of `reflect` outside an allowed package. Application code decodes at its boundary ' +
            'and keeps concrete types inside.',
          'warning',
        );
      }
    }
  }

  // G08: monkey patching in tests (import paths matched on original lines).
  if (test) {
    lines.forEach((line, i) => {
      if (/^\s*(?:[\w.]+\s+)?"(?:[^"\n]*\/)?(?:bouke\/monkey|gomonkey)[^"\n]*"/.test(line)) {
        report(
          'no-monkey-patch',
          'anti-slop-go/G08-nomonkeypatch',
          'dependency-substitution',
          i + 1,
          1,
          'Runtime patching library rewires production code. Put the seam in the design: accept an ' +
            'interface or function value.',
        );
      }
    });
    lines.forEach((line, i) => {
      if (/^\s*\/\/go:linkname/.test(line)) {
        report(
          'no-monkey-patch',
          'anti-slop-go/G08-nomonkeypatch',
          'dependency-substitution',
          i + 1,
          1,
          '`//go:linkname` rewires production code from a test. Put the seam in the design instead.',
        );
      }
    });
    const rewireRe = /^(\s*)([A-Za-z_][\w.]*\.[A-Z][\w]*)\s*=/;
    maskedLines.forEach((line, i) => {
      const m = rewireRe.exec(line);
      if (m && !/==|!=|<=|>=/.test(line)) {
        report(
          'no-monkey-patch',
          'anti-slop-go/G08-nomonkeypatch',
          'dependency-substitution',
          i + 1,
          m.index + 1,
          `Assignment to package-level \`${m[2]}\` rewires production behaviour from a test. Give ` +
            'the test its own value through a parameter or field.',
        );
      }
    });
  }

  // G11: panic / os.Exit / log.Fatal in library code. The upstream rule exempts
  // `func main` of a main package and `init` — not every function that happens
  // to live in a main package — so the check is per call site, not per file.
  if (!test) {
    const stopRe = /\bpanic\s*\(|\bos\s*\.\s*Exit\s*\(|\blog\s*\.\s*(?:Fatal|Fatalf|Fatalln|Panic|Panicf|Panicln)\s*\(/g;
    const inMainOrInit = (idx) => {
      for (let j = idx; j >= Math.max(0, idx - 30); j -= 1) {
        const m = /^\s*func\s+(?:\([^)]*\)\s*)?(main|init)\s*\(/.exec(maskedLines[j]);
        if (m) return true;
        if (/^\s*func\s+/.test(maskedLines[j]) && j !== idx) return false;
      }
      return false;
    };
    maskedLines.forEach((line, i) => {
      stopRe.lastIndex = 0;
      let m;
      while ((m = stopRe.exec(line)) !== null) {
        if (inMainOrInit(i)) continue;
        if (/recover\s*\(\)/.test(maskedLines.slice(Math.max(0, i - 3), i + 1).join('\n'))) continue;
        if (hasJustification(lines, i)) continue;
        report(
          'require-panic-justification',
          'anti-slop-go/G11-justifypanic',
          'incomplete-failure-handling',
          i + 1,
          m.index + 1,
          'Stopping the process in library code is an API decision. State why the process cannot ' +
            'continue in a comment directly above, or return the failure to the caller.',
          'warning',
        );
      }
    });
  }

  // G13: error-text assertions in tests.
  if (test) {
    const textRe = /err\s*\.\s*Error\s*\(\s*\)/g;
    maskedLines.forEach((line, i) => {
      textRe.lastIndex = 0;
      let m;
      while ((m = textRe.exec(line)) !== null) {
        const rest = line.slice(m.index);
        if (/==|!=|Contains|HasPrefix|HasSuffix|MatchString|Equal\(/.test(rest)) {
          report(
            'no-error-text-assert',
            'anti-slop-go/G13-errsemantics',
            'stringly-typed-authority',
            i + 1,
            m.index + 1,
            'Test asserts the text of an error instead of its identity. Use errors.Is for sentinels ' +
              'and errors.As for types.',
            'warning',
          );
        }
      }
    });
  }

  return { findings, failures };
}

export const GO_EXTENSIONS = ['.go'];
