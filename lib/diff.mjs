// Unified-diff parsing. Enough structure to make findings point at the actual
// intervention: which paths moved, how, and where the hunks land. Deliberately
// not a semantic engine — the skill supplies the semantics.

const GENERATED_HINTS = [
  /(^|\/)(dist|build|out|target|vendor|node_modules|\.next|__generated__|gen)\//,
  /\.(lock)$/,
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|Cargo\.lock|poetry\.lock|go\.sum|composer\.lock|Gemfile\.lock)$/,
  /\.(pb|generated|g)\.(go|ts|js|py|cs|dart)$/,
  /\.min\.(js|css)$/,
];

const TEST_HINTS = [
  /(^|\/)(tests?|__tests__|spec|e2e|integration)\//,
  /(\.|_|-)(test|spec)\.[a-z0-9]+$/,
  /(^|\/)test_[^/]+\.py$/,
  /_test\.(go|py|rb|exs?)$/,
];

const ASSET_HINTS = /\.(png|jpe?g|gif|webp|avif|svg|ico|mp4|webm|mov|mp3|wav|woff2?|ttf|otf|eot|pdf|zip|tar|gz)$/i;

export function classifyPath(path) {
  if (GENERATED_HINTS.some((re) => re.test(path))) return 'generated';
  if (TEST_HINTS.some((re) => re.test(path))) return 'test';
  if (ASSET_HINTS.test(path)) return 'asset';
  if (/(^|\/)docs?\//.test(path) || /\.(md|mdx|rst|adoc|txt)$/.test(path)) return 'docs';
  if (/(^|\/)\.[^/]+$/.test(path) || /\.(ya?ml|toml|ini|cfg|json5?)$/.test(path)) return 'config';
  return 'source';
}

function unquote(path) {
  if (!path.startsWith('"')) return path;
  const body = path.slice(1, -1);
  return body.replace(/\\(["\\])/g, '$1').replace(/\\([0-7]{3})/g, (_, oct) =>
    String.fromCharCode(parseInt(oct, 8)),
  );
}

function stripPrefix(path) {
  const clean = unquote(path.trim());
  if (clean === '/dev/null') return null;
  return clean.replace(/^[ab]\//, '');
}

function splitGitHeader(line) {
  // `diff --git a/x b/y` — paths may contain spaces, so anchor on ` b/`.
  const rest = line.slice('diff --git '.length);
  const pivot = rest.lastIndexOf(' b/');
  if (pivot === -1) return {};
  return { old: stripPrefix(rest.slice(0, pivot)), next: stripPrefix(rest.slice(pivot + 1)) };
}

/**
 * @param {string} text unified diff
 * @returns {{files: Array, additions: number, deletions: number}}
 */
export function parseDiff(text) {
  const files = [];
  if (!text || !text.trim()) return { files, additions: 0, deletions: 0 };

  const lines = text.split('\n');
  let file = null;
  let hunk = null;

  const push = () => {
    if (!file) return;
    file.status ??= 'modified';
    file.path = file.newPath ?? file.oldPath;
    file.kind = classifyPath(file.path ?? '');
    files.push(file);
  };

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      push();
      const { old, next } = splitGitHeader(line);
      file = {
        path: next ?? old ?? null,
        oldPath: old ?? null,
        newPath: next ?? null,
        status: null,
        binary: false,
        additions: 0,
        deletions: 0,
        hunks: [],
      };
      hunk = null;
      continue;
    }
    if (!file) continue;

    if (line.startsWith('new file mode')) file.status = 'added';
    else if (line.startsWith('deleted file mode')) file.status = 'deleted';
    else if (line.startsWith('rename from ')) {
      file.status = 'renamed';
      file.oldPath = stripPrefix(line.slice('rename from '.length));
    } else if (line.startsWith('rename to ')) {
      file.status = 'renamed';
      file.newPath = stripPrefix(line.slice('rename to '.length));
    } else if (line.startsWith('copy to ')) {
      file.status = 'copied';
      file.newPath = stripPrefix(line.slice('copy to '.length));
    } else if (line.startsWith('similarity index ')) {
      file.similarity = Number.parseInt(line.slice('similarity index '.length), 10);
    } else if (line.startsWith('Binary files ') || line.startsWith('GIT binary patch')) {
      file.binary = true;
    } else if (line.startsWith('--- ')) {
      const p = stripPrefix(line.slice(4));
      if (p) file.oldPath = p;
      else file.status = 'added';
    } else if (line.startsWith('+++ ')) {
      const p = stripPrefix(line.slice(4));
      if (p) file.newPath = p;
      else file.status = 'deleted';
    } else if (line.startsWith('@@')) {
      const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@ ?(.*)$/.exec(line);
      if (m) {
        hunk = {
          oldStart: Number(m[1]),
          oldLines: m[2] === undefined ? 1 : Number(m[2]),
          newStart: Number(m[3]),
          newLines: m[4] === undefined ? 1 : Number(m[4]),
          section: m[5] || '',
        };
        file.hunks.push(hunk);
      }
    } else if (hunk) {
      if (line.startsWith('+')) file.additions += 1;
      else if (line.startsWith('-')) file.deletions += 1;
    }
  }
  push();

  return {
    files,
    additions: files.reduce((n, f) => n + f.additions, 0),
    deletions: files.reduce((n, f) => n + f.deletions, 0),
  };
}

/** Coarse shape signals the skill uses to judge change discipline. */
export function summarizeChange(parsed) {
  const byKind = {};
  const byStatus = {};
  for (const f of parsed.files) {
    byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
    byStatus[f.status] = (byStatus[f.status] ?? 0) + 1;
  }
  const dirs = new Set(
    parsed.files.map((f) => (f.path ?? '').split('/').slice(0, -1).join('/') || '.'),
  );
  return {
    files: parsed.files.length,
    additions: parsed.additions,
    deletions: parsed.deletions,
    directories: dirs.size,
    byKind,
    byStatus,
    touchesTests: (byKind.test ?? 0) > 0,
    touchesGenerated: (byKind.generated ?? 0) > 0,
  };
}
