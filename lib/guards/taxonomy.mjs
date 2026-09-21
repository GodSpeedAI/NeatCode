// NeatCode guard taxonomy: the language-independent families that equivalent
// failures across JavaScript/TypeScript, Python, Go, and Rust map to.
//
// One concept, one authority: rule implementations in lib/guards/*.mjs name a
// family from this table plus their own rule id and the upstream rule id they
// were adapted from. A family exists only because real implemented rules use
// it — there are no placeholder categories.

export const FAMILIES = {
  'type-laundering': {
    title: 'Type laundering',
    description:
      'A known type is widened through a broad type and then asserted back. ' +
      'The widening discards evidence the program already had; the assertion recreates it as a guess.',
  },
  'known-value-widening': {
    title: 'Known-value widening',
    description:
      'A syntactically established value (literal, constructor, narrow assertion) flows ' +
      'into an explicitly broad annotation that discards useful evidence.',
  },
  'broad-untyped-contract': {
    title: 'Broad untyped contract',
    description:
      'A function signature, alias, struct field, or map contract uses a top or dynamic type ' +
      '(unknown, any, object, map[string]any, Box<dyn Error>) where a named domain type belongs.',
  },
  'runtime-type-recovery': {
    title: 'Runtime type recovery',
    description:
      'Runtime type queries (typeof, isinstance, type assertions on errors, TypeId checks) ' +
      'recover information that should have been decoded into a meaningful type at the I/O boundary.',
  },
  'dynamic-dispatch': {
    title: 'Dynamic dispatch',
    description:
      'Reflective or string-driven dispatch (Reflect.get/apply, reflect, getattr dispatch, ' +
      'ad-hoc type switches, TypeId branching) replaces an available static contract.',
  },
  'unjustified-escape-hatch': {
    title: 'Unjustified escape hatch',
    description:
      'An escape hatch that suspends the type system or process safety (type assertion, ' +
      'unsafe, transmute, panic in library code) carries no nearby stated invariant.',
  },
  'dependency-substitution': {
    title: 'Dependency substitution',
    description:
      'Tests replace dependencies by rewiring production code (module mocking, global ' +
      'reassignment, linkname) instead of through a designed seam.',
  },
  'boundary-not-parsed': {
    title: 'Boundary not parsed',
    description:
      'Untyped data (serde_json::Value, untyped maps) escapes an I/O or decoding boundary ' +
      'into signatures and domain models instead of being parsed once into a named type.',
  },
  'incomplete-failure-handling': {
    title: 'Incomplete failure handling',
    description:
      'Failure paths are cut short: swallowed exceptions, panic macros in library code, ' +
      'unjustified process exits. The failure exists; handling it does not.',
  },
  'stringly-typed-authority': {
    title: 'Stringly typed authority',
    description:
      'Strings stand in for domain roles: structure-describing words in symbol names, ' +
      'error-text comparison instead of error identity, string-driven dispatch.',
  },
  'evidence-erasure': {
    title: 'Evidence erasure',
    description:
      'A concrete type is erased into a dynamic container (dyn Any, Box<dyn Any>) with no ' +
      'recorded reason, forcing every later reader to recover what the author already knew.',
  },
};

export function isKnownFamily(family) {
  return Object.hasOwn(FAMILIES, family);
}
