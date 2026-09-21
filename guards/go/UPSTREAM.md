# Upstream provenance — Go guards

- Upstream repository: https://github.com/JacobJNilsson/anti-slop-go
- Source commit SHA: `36d12cfb7beffcd51c546e7e7a3b3f26f32cadea` (HEAD on 2026-09-20)
- License: MIT, Copyright (c) 2026 Jacob Nilsson (see `LICENSE` in this directory)
- Date integrated: 2026-09-20
- Integrated by: GodSpeedAI/NeatCode

## Files copied (verbatim into `upstream/`)

- `analyzers/*/*.go` except `*_test.go` and `testdata/` → `upstream/analyzers/`
  (14 analyzer implementations)
- `internal/` except `*_test.go` and `testdata/` → `upstream/internal/`
  (shared signature/justification helpers)
- `cmd/` → `upstream/cmd/` (standalone driver entry point)
- `go.mod` → `upstream/go.mod` (module/dependency record)

Omitted: `*_test.go`, `testdata/`, `docs/spec/`, `plugin/`, `scripts/`,
`Makefile`, `go.sum`, lockfiles.

## NeatCode modifications

The upstream analyzers are `go/analysis` passes requiring the Go type
checker. NeatCode's harness is zero-dependency Node, so the vendored sources
are **reference, not executed code**. The runnable implementation is
`lib/guards/go.mjs`: dependency-free syntactic detectors implementing the
same rule contracts (G01–G08, G10, G11, G13) over comment/string-masked source.

## Intentional deviations

- G03 (`noanyparam`): the syntactic exemptions are ported (fmt-style
  variadic, `cause` params, `CONTRACT:` comments), plus `type A = any`
  alias-use resolution and defined-type acceptance. The interface-satisfaction
  exemption (a method keeping a parameter to satisfy an imported interface)
  needs the type checker and is not ported — the one residual that cannot be
  established from syntax.
- G06 (`noadhoctypeswitch`): cannot read the operand's static type, so three
  signals combine — decode-oriented files/packages exempt by path, operands
  with a locally declared named contract or `error` skipped, the rest
  flagged.
- G10 (`noerrorassert`): reads the receiver name `err` plus identifiers
  assigned from a call and compared against nil (error-shaped evidence).
- G05 (`nolaundering`): binding shape fires only for composite-literal
  initializers (genuinely known syntax). `any(x)` conversions of unknown
  values are accepted, matching the upstream "real question" carve-out.
- G09 (`nointerfacereturn`): not ported; needs return-type resolution.
- G12 (`fullstructcomp`), G14 (`separategotwant`): not ported; too heuristic
  for syntax-level detection.

Rule mapping (NeatCode rule → upstream rule, e.g.
`anti-slop-go/G01-safetyassert`) is recorded per finding in the
`upstream_rule_id` field.
