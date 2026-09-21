// Shared syntactic scanning helpers for the dependency-free guard analyzers.
//
// The JavaScript/TypeScript, Go, and Rust detectors cannot depend on a real
// parser (NeatCode's harness is zero-dependency by design), so they work on
// masked source: comments and string/char/template literal contents are
// replaced with spaces, preserving every newline and column offset. Patterns
// therefore never match inside a comment or a string literal, and reported
// line/column numbers still point at the original file.
//
// This is deliberately weaker than the upstream AST analyzers. Each language
// module documents the precision it gives up in its header comment.

/**
 * Mask comments and string literals with spaces, preserving newlines.
 * Handles // and slash-star comments, single/double/backtick strings with
 * escapes, and ${} interpolation inside template literals (code inside ${}
 * is kept: it is real code). Go/Rust have no ${} interpolation; passing
 * templates:false treats backticks as plain strings (Go raw strings).
 */
export function maskSource(source, { templates = true } = {}) {
  const out = [];
  const n = source.length;
  let i = 0;

  const pushSpaces = (text) => {
    for (const ch of text) out.push(ch === '\n' ? '\n' : ' ');
  };

  // Recursive descent for one template literal starting after the backtick.
  const maskTemplate = (start) => {
    let j = start;
    let depth = 0;
    let buf = '';
    while (j < n) {
      const ch = source[j];
      if (ch === '\\') {
        buf += '  ';
        j += 2;
        continue;
      }
      if (ch === '`' && depth === 0) {
        pushSpaces(buf);
        out.push(' ');
        return j + 1;
      }
      if (ch === '$' && source[j + 1] === '{') {
        pushSpaces(buf);
        buf = '';
        out.push(' ', ' ');
        j += 2;
        // Keep the interpolated code verbatim until the matching brace.
        let braces = 1;
        while (j < n && braces > 0) {
          const c = source[j];
          if (c === '{') braces += 1;
          else if (c === '}') braces -= 1;
          if (braces === 0) break;
          out.push(c);
          j += 1;
        }
        out.push(' ');
        j += 1;
        continue;
      }
      buf += ch;
      j += 1;
    }
    pushSpaces(buf);
    return j;
  };

  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === '/' && next === '/') {
      let j = i;
      while (j < n && source[j] !== '\n') j += 1;
      pushSpaces(source.slice(i, j));
      i = j;
      continue;
    }
    if (ch === '/' && next === '*') {
      let j = i + 2;
      while (j < n && !(source[j] === '*' && source[j + 1] === '/')) j += 1;
      j = Math.min(n, j + 2);
      pushSpaces(source.slice(i, j));
      i = j;
      continue;
    }
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < n) {
        if (source[j] === '\\') {
          j += 2;
          continue;
        }
        if (source[j] === ch) {
          j += 1;
          break;
        }
        if (source[j] === '\n' && ch === "'") break; // unterminated; bail out
        j += 1;
      }
      pushSpaces(source.slice(i, j));
      i = j;
      continue;
    }
    if (ch === '`') {
      if (!templates) {
        let j = i + 1;
        while (j < n && source[j] !== '`') j += 1;
        j = Math.min(n, j + 1);
        pushSpaces(source.slice(i, j));
        i = j;
        continue;
      }
      out.push(' ');
      i = maskTemplate(i + 1);
      continue;
    }
    out.push(ch);
    i += 1;
  }
  return out.join('');
}

/** Python masking: # comments plus single/double/triple-quoted strings. */
export function maskPython(source) {
  const out = [];
  const n = source.length;
  let i = 0;
  const pushSpaces = (text) => {
    for (const ch of text) out.push(ch === '\n' ? '\n' : ' ');
  };
  while (i < n) {
    const ch = source[i];
    if (ch === '#') {
      let j = i;
      while (j < n && source[j] !== '\n') j += 1;
      pushSpaces(source.slice(i, j));
      i = j;
      continue;
    }
    const triple = source.startsWith("'''", i) || source.startsWith('"""', i);
    if (ch === "'" || ch === '"') {
      const quote = triple ? source.slice(i, i + 3) : ch;
      let j = i + quote.length;
      while (j < n) {
        if (!triple && source[j] === '\n') break;
        if (source[j] === '\\') {
          j += 2;
          continue;
        }
        if (source.startsWith(quote, j)) {
          j += quote.length;
          break;
        }
        j += 1;
      }
      pushSpaces(source.slice(i, j));
      i = j;
      continue;
    }
    out.push(ch);
    i += 1;
  }
  return out.join('');
}

/** Split into lines (1-based indexing: lines[0] is line 1). */
export function linesOf(source) {
  return source.split('\n');
}

/** Brace-depth of every line start: depth[lineIndex] for lineIndex 0-based.
 *  Computed on masked source so braces in strings/comments do not count. */
export function braceDepths(masked) {
  const lines = linesOf(masked);
  const depths = [];
  let depth = 0;
  for (const line of lines) {
    depths.push(depth);
    for (const ch of line) {
      if (ch === '{') depth += 1;
      else if (ch === '}') depth = Math.max(0, depth - 1);
    }
  }
  return depths;
}

/**
 * Approximate function-body ranges: for each line index, the id of the
 * innermost enclosing function-like block, or -1 for top level.
 * Starts a function at lines matching startPattern (which must end with an
 * opening brace on the same line); the function owns lines until its brace
 * depth returns below the depth after that brace. Conservative: lines the
 * tracker cannot attribute keep -1, and detectors only pair findings that
 * share the same non-negative id or are both top-level in small files.
 */
export function functionRanges(maskedLines, depths, startPattern) {
  const owner = new Array(maskedLines.length).fill(-1);
  const stack = []; // {id, depth}
  let nextId = 0;
  for (let i = 0; i < maskedLines.length; i += 1) {
    const line = maskedLines[i];
    if (startPattern.test(line) && line.includes('{')) {
      const opens = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;
      if (opens > closes) {
        const id = nextId;
        nextId += 1;
        stack.push({ id, depth: depths[i] + (opens - closes) });
      }
    }
    while (stack.length && depths[i] < stack[stack.length - 1].depth) stack.pop();
    // Recompute ownership after popping: current innermost.
    if (stack.length) owner[i] = stack[stack.length - 1].id;
    // A line that closes the last open block belongs to the block it closed:
    // depths[i+1] would drop, but owner[i] already records innermost. Keep.
  }
  return owner;
}

/** True when any line in lines[lo..hi] (0-based, inclusive) matches pattern. */
export function anyLineMatches(lines, lo, hi, pattern) {
  const start = Math.max(0, lo);
  const end = Math.min(lines.length - 1, hi);
  for (let i = start; i <= end; i += 1) {
    if (pattern.test(lines[i])) return true;
  }
  return false;
}
