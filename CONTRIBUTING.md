# Contributing to OpenDGD

OpenDGD is a public standard stewarded by NCB Hazcheck. Improvements, corrections and real-world
implementation feedback are welcome.

## Ways to contribute

- **Report a problem or ambiguity** in the schema, the rendering algorithm or the spec, open an issue
  with a concrete example (the input data and the wrong/ambiguous output).
- **Propose a change**, open a pull request against the relevant file in `spec/`. Substantive changes
  should include the rationale and, where they touch box-14 output, an accompanying conformance case.
- **Share an implementation**, building an OpenDGD renderer, validator or converter? Tell us; we'll
  link it and, once the conformance suite lands, run it against the shared cases.

## What "done" looks like for a change

| Change touches… | Also update… |
|-----------------|--------------|
| `opendgd.schema.json` | `spec/SPEC.md` (§3 mapping/summary) and, if a new field affects box 14, `spec/rendering.md` |
| `spec/rendering.md` | a conformance case in `spec/conformance/` (once it exists) proving the new output |
| `spec/openapi.yaml` | the API section of `spec/SPEC.md` |
| Any normative behaviour | the changelog and the version, per the versioning rules in `SPEC.md §7` |

## Ground rules

- **The IMDG Code governs.** Proposals must not contradict the IMDG Code; cite the relevant provision.
- **Additive within a MAJOR version.** Don't break existing valid documents without a MAJOR bump and a
  migration note.
- **Keep it small.** OpenDGD stays deliberately minimal. Vendor- or use-case-specific data belongs in
  the namespaced `extensions` bag, not in the core schema.
- **Show your working.** Every normative change needs an example.

## Licensing of contributions

By contributing you agree that specification/schema/algorithm contributions are licensed under
**CC BY 4.0** and code/example/suite contributions under **Apache-2.0**, consistent with
[`LICENSE`](LICENSE).

See [`GOVERNANCE.md`](GOVERNANCE.md) for how decisions are made.
