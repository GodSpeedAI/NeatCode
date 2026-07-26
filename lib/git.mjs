// Git access for change acquisition. Every call goes through spawnSync with an
// argv array — never a shell string — so branch names and paths cannot inject.

import { spawnSync } from 'node:child_process';

const MAX_BUFFER = 64 * 1024 * 1024;

export class GitError extends Error {}

export function git(args, { cwd = process.cwd(), allowFail = false } = {}) {
  const run = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: MAX_BUFFER });
  if (run.error) throw new GitError(`git ${args[0]}: ${run.error.message}`);
  if (run.status !== 0 && !allowFail) {
    throw new GitError(`git ${args.join(' ')} exited ${run.status}: ${(run.stderr || '').trim()}`);
  }
  return { stdout: run.stdout ?? '', stderr: run.stderr ?? '', status: run.status };
}

export function repoRoot(cwd = process.cwd()) {
  const { stdout, status } = git(['rev-parse', '--show-toplevel'], { cwd, allowFail: true });
  if (status !== 0) throw new GitError(`not inside a git repository: ${cwd}`);
  return stdout.trim();
}

export function isGitRepo(cwd = process.cwd()) {
  try {
    repoRoot(cwd);
    return true;
  } catch {
    return false;
  }
}

export function resolveRev(rev, cwd) {
  const { stdout, status } = git(['rev-parse', '--verify', '--quiet', `${rev}^{commit}`], {
    cwd,
    allowFail: true,
  });
  if (status !== 0) throw new GitError(`unknown revision: ${rev}`);
  return stdout.trim();
}

export function headRev(cwd) {
  const { stdout, status } = git(['rev-parse', '--verify', '--quiet', 'HEAD'], {
    cwd,
    allowFail: true,
  });
  return status === 0 ? stdout.trim() : null;
}

export function currentBranch(cwd) {
  const { stdout, status } = git(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, allowFail: true });
  const name = stdout.trim();
  return status === 0 && name && name !== 'HEAD' ? name : null;
}

/**
 * Acquire a unified diff for one of the supported change sources.
 *
 * source.mode is one of: working-tree | staged | commit | range | patch.
 * Returns { mode, base, head, diff, describe } where `describe` is the human
 * label the skill quotes back to the user.
 */
export function acquireDiff(source, { cwd = process.cwd() } = {}) {
  const common = ['--no-color', '--find-renames', '--no-ext-diff'];
  const paths = source.paths?.length ? ['--', ...source.paths] : [];

  switch (source.mode) {
    case 'working-tree': {
      const head = headRev(cwd);
      const diff = git(['diff', ...common, 'HEAD', ...paths], { cwd, allowFail: true });
      // A repository with no commits yet has no HEAD to diff against.
      const text = diff.status === 0 ? diff.stdout : git(['diff', ...common, ...paths], { cwd }).stdout;
      return { mode: 'working-tree', base: head, head: null, diff: text, describe: 'working tree vs HEAD' };
    }
    case 'staged': {
      const head = headRev(cwd);
      const { stdout } = git(['diff', ...common, '--cached', ...paths], { cwd });
      return { mode: 'staged', base: head, head: null, diff: stdout, describe: 'staged changes vs HEAD' };
    }
    case 'commit': {
      const rev = resolveRev(source.rev, cwd);
      const { stdout } = git(['show', ...common, '--format=', rev, ...paths], { cwd });
      return { mode: 'commit', base: `${rev}^`, head: rev, diff: stdout, describe: `commit ${rev.slice(0, 12)}` };
    }
    case 'range': {
      const { base, head, symmetric } = parseRange(source.range);
      const baseRev = resolveRev(base, cwd);
      const headRevision = head ? resolveRev(head, cwd) : headRev(cwd);
      const spec = symmetric ? `${base}...${head || 'HEAD'}` : `${base}..${head || 'HEAD'}`;
      const { stdout } = git(['diff', ...common, spec, ...paths], { cwd });
      return {
        mode: 'range',
        base: baseRev,
        head: headRevision,
        diff: stdout,
        describe: `${symmetric ? 'branch comparison' : 'commit range'} ${spec}`,
      };
    }
    default:
      throw new GitError(`unsupported change source: ${source.mode}`);
  }
}

export function parseRange(range) {
  if (typeof range !== 'string' || !range.includes('..')) {
    throw new GitError(`not a commit range: ${range}`);
  }
  const symmetric = range.includes('...');
  const [base, head] = range.split(symmetric ? '...' : '..');
  if (!base) throw new GitError(`commit range needs a base: ${range}`);
  return { base, head: head || '', symmetric };
}

/** Tracked files, used for tree morphology and bounded context expansion. */
export function trackedFiles(cwd) {
  const { stdout } = git(['ls-files', '-z'], { cwd });
  return stdout.split('\0').filter(Boolean);
}

/** Files that git considers dirty right now — evidence of an unclean tree. */
export function workingTreeStatus(cwd) {
  const { stdout } = git(['status', '--porcelain=v1', '-z'], { cwd });
  const entries = [];
  const parts = stdout.split('\0');
  for (let i = 0; i < parts.length; i += 1) {
    const entry = parts[i];
    if (!entry) continue;
    const code = entry.slice(0, 2);
    const path = entry.slice(3);
    // Renames carry the source path in the following NUL-separated field.
    if (code[0] === 'R' || code[0] === 'C') i += 1;
    entries.push({ code, path });
  }
  return entries;
}
