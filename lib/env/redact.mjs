// Secret redaction for environment and service discovery.
//
// Security invariant: API keys, bearer tokens, passwords, private headers,
// raw secret environment values, and credential file contents must never be
// printed, serialized, logged, or placed into the change envelope. This module
// is the single authority for what counts as secret-bearing and how it is
// replaced. Discovery modules record names/shapes; values die here.

const SECRET_KEY_HINTS = [
  'token', 'secret', 'password', 'passwd', 'pwd', 'bearer', 'apikey', 'api_key',
  'private_key', 'privatekey', 'client_secret', 'auth', 'credential', 'session',
  'cookie', 'otp', 'pin', 'passphrase',
];

const SECRET_VALUE_SHAPE = /^(sk-|ghp_|gho_|github_pat_|xox[bpas]-|AKIA|-----BEGIN .*PRIVATE KEY-----)/;

export const REDACTED = '[redacted]';

/** True when a config key name suggests it holds a secret. */
export function isSecretKey(name) {
  if (typeof name !== 'string') return false;
  const lower = name.toLowerCase().replace(/[-_\s]/g, '');
  if (lower === 'auth' || lower === 'auths') return true;
  return SECRET_KEY_HINTS.some((hint) => lower.includes(hint.replace(/_/g, '')));
}

/** True when a scalar value looks like a secret by shape (long opaque string). */
export function looksLikeSecretValue(value) {
  if (typeof value !== 'string' || value.length < 8) return false;
  if (SECRET_VALUE_SHAPE.test(value)) return true;
  // Paths, URLs, and sentences are never secret-shaped, even when long:
  // without this carve-out every absolute binary path redacts as a secret.
  if (/[/\s]/.test(value)) return false;
  // Long opaque strings with secret-ish shape and no spaces.
  if (/^\S{24,}$/.test(value) && /[A-Za-z]/.test(value) && /[0-9_\-+=]/.test(value)) return true;
  return false;
}

/**
 * Redact one scalar: keep non-secret values, replace secret values.
 * `keyHint` is the config key the value sits under (when known).
 */
export function redactScalar(value, keyHint = '') {
  if (typeof value !== 'string') return value;
  if (isSecretKey(keyHint) || looksLikeSecretValue(value)) return REDACTED;
  return value;
}

/** Strip userinfo (`user:pass@`) from an endpoint URL. */
export function redactEndpoint(url) {
  if (typeof url !== 'string') return url;
  return url.replace(/^([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)[^/@\s]+@/g, '$1' + REDACTED + '@');
}

/**
 * Deep-redact a parsed config object. Returns { redacted, credentialsPresent,
 * credentialVariables }: secret values become "[redacted]", env-var VALUES are
 * dropped but their NAMES are kept in credentialVariables.
 */
export function redactConfig(value, keyHint = '') {
  const credentialVariables = new Set();
  const walk = (node, hint) => {
    if (Array.isArray(node)) return node.map((v) => walk(v, hint));
    if (node !== null && typeof node === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(node)) {
        const lower = k.toLowerCase();
        if (lower === 'env' && v !== null && typeof v === 'object' && !Array.isArray(v)) {
          // Environment maps: keep variable names, drop every value.
          out[k] = {};
          for (const name of Object.keys(v)) {
            out[k][name] = REDACTED;
            credentialVariables.add(name);
          }
          continue;
        }
        if (['http_headers', 'httpheaders', 'headers'].includes(lower.replace(/[-_\s]/g, ''))) {
          out[k] = REDACTED;
          continue;
        }
        out[k] = walk(v, k);
      }
      return out;
    }
    if (typeof node === 'string') {
      if (isSecretKey(hint)) {
        if (/^[A-Z][A-Z0-9_]*$/.test(node)) credentialVariables.add(node); // env-var reference, not a value
        return REDACTED;
      }
      // A reference (`$VAR`, `${VAR}`, `env:VAR`) is metadata, not a secret.
      const ref = /^(?:env:|\$\{?)([A-Z_][A-Z0-9_]*)\}?$/.exec(node);
      if (ref) {
        credentialVariables.add(ref[1]);
        return node;
      }
      if (looksLikeSecretValue(node)) return REDACTED;
      if (hint.toLowerCase().includes('url') || hint.toLowerCase().includes('endpoint')) {
        return redactEndpoint(node);
      }
      return node;
    }
    return node;
  };
  const redacted = walk(value, keyHint);
  return {
    redacted,
    credentialsPresent: credentialVariables.size > 0 || containsRedacted(redacted),
    credentialVariables: [...credentialVariables].sort(),
  };
}

function containsRedacted(node) {
  if (node === REDACTED) return true;
  if (Array.isArray(node)) return node.some(containsRedacted);
  if (node !== null && typeof node === 'object') return Object.values(node).some(containsRedacted);
  return false;
}
