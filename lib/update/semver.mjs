// Semantic version parsing and comparison (SemVer 2.0.0 compliant).
// Zero external dependencies; uses native JavaScript.

const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * Parse a semantic version string.
 * @param {string} v
 * @returns {{ major: number, minor: number, patch: number, prerelease: string[], build: string[], raw: string } | null}
 */
export function parseSemver(v) {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim().replace(/^v/, '');
  const match = SEMVER_REGEX.exec(trimmed);
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split('.') : [],
    build: match[5] ? match[5].split('.') : [],
    raw: trimmed,
  };
}

/**
 * Compare two semver prerelease identifier components.
 */
function comparePrereleaseComponent(a, b) {
  const aIsNum = /^\d+$/.test(a);
  const bIsNum = /^\d+$/.test(b);

  if (aIsNum && bIsNum) {
    const na = Number(a);
    const nb = Number(b);
    if (na < nb) return -1;
    if (na > nb) return 1;
    return 0;
  }
  if (aIsNum && !bIsNum) return -1;
  if (!aIsNum && bIsNum) return 1;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Compare two semver strings or parsed objects.
 * Returns -1 if a < b, 1 if a > b, 0 if equal.
 */
export function compareSemver(a, b) {
  const pa = typeof a === 'string' ? parseSemver(a) : a;
  const pb = typeof b === 'string' ? parseSemver(b) : b;

  if (!pa || !pb) {
    throw new Error(`Invalid semver comparison: "${a}" vs "${b}"`);
  }

  if (pa.major !== pb.major) return pa.major < pb.major ? -1 : 1;
  if (pa.minor !== pb.minor) return pa.minor < pb.minor ? -1 : 1;
  if (pa.patch !== pb.patch) return pa.patch < pb.patch ? -1 : 1;

  // A normal version has higher precedence than a pre-release version
  if (pa.prerelease.length === 0 && pb.prerelease.length > 0) return 1;
  if (pa.prerelease.length > 0 && pb.prerelease.length === 0) return -1;
  if (pa.prerelease.length === 0 && pb.prerelease.length === 0) return 0;

  // Both have pre-release versions
  const len = Math.min(pa.prerelease.length, pb.prerelease.length);
  for (let i = 0; i < len; i++) {
    const cmp = comparePrereleaseComponent(pa.prerelease[i], pb.prerelease[i]);
    if (cmp !== 0) return cmp;
  }

  if (pa.prerelease.length < pb.prerelease.length) return -1;
  if (pa.prerelease.length > pb.prerelease.length) return 1;
  return 0;
}

/**
 * Check if a version is a pre-release.
 * @param {string} v
 * @returns {boolean}
 */
export function isPrerelease(v) {
  const parsed = parseSemver(v);
  return !!(parsed && parsed.prerelease.length > 0);
}

/**
 * Sort version strings in ascending semver order.
 * @param {string[]} versions
 * @returns {string[]}
 */
export function sortSemver(versions) {
  return [...versions].sort((a, b) => compareSemver(a, b));
}
