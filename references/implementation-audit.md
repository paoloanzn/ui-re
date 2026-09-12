# Completion audit

The full 15-part objective was checked against source, executable checks and generated artifacts. This audit describes the skill package and its controlled-target end-to-end evaluation; it does not claim that the reconstruction-preparation command autonomously writes a website.

| Requirement | Authoritative evidence |
|---|---|
| 1: compact skill-writing conventions | Root `SKILL.md`: supported name/description/license/compatibility frontmatter, 20 lines, five direct phase/evaluation references. `node scripts/check-skill.mjs` passes. Activation is scoped to a reference website/evidence bundle. |
| 2: preflight/setup | `scripts/check-environment.mjs`, shared browser discovery and `setup.mjs`; real Node 24.19.0/npm/Chrome 152.0.7977.84/CDP/write checks pass. Missing-package, malformed-manifest and unapproved-setup tests pass. Setup was run twice with the already-working environment; both completed without package/browser installation. No global or system configuration was changed. |
| 3: deterministic/agent boundary | `src/core/` contains evidence transforms, matching, statistics and comparisons. Root skill and reconstruction reference assign UI/component/theme/state reasoning and repairs to the agent. No provider or API-key dependency exists. |
| 4: four independent phases | CLI `capture`, `preprocess`, `reconstruct`, `render`, `verify`, `run`; disk-resume pipeline test passes. Capture/IR remain separate, and existing output directories are refused. Versioned contracts validate persisted phase boundaries. |
| 5: browser-native capture | `capture.ts`, `domSnapshotStrategy.ts`, `captureCss.ts`, `captureAccessibility.ts`, computed-style allowlist and raw contracts. The final fixture has ten DOMSnapshot/AX/CSS/font/asset/screenshot/archive frames and no capture warnings. Tests cover adjacent CSS breakpoints, desktop/mobile, dialog, menu/hover, alternate route, child-frame AX and custom snapshot strategy. Unavailable/404 media and out-of-session frames are reported explicitly. |
| 6: compact normalized evidence | `normalize`, `compactCss`, `preprocess`, token statistics and matching. Final 28 model-facing JSON files contain no image data URLs; all frame trees have unique IDs and valid parent/child references. Text/attributes, document metadata, visibility, geometry, CSS intent, fonts, assets, regions, responsive deltas and objective token candidates are present. A 100KB inline-data test verifies externalization. Wrapper/visibility tests and pass injection tests pass. |
| 7: reconstruction/React/shadcn | `FrameworkAdapter`, `reactAdapter`, preparation API/CLI, root skill and focused reconstruction guide. Both default and `--shadcn` tasks were generated and inspected against the final IR. Tasks explicitly await agent implementation, preserve editable TSX and describe semantic shadcn source controls/theme customization. |
| 8: first-class verification | `comparePixels`, `compareGeometry`, `verify`, schemas and verification reference. Final ten frames pass at zero pixel error/geometry delta. Integration deliberately changes layout by 24px and observes failure; also tests malformed images, frozen thresholds/reference digest and repair limit. Reports preserve per-frame metrics, changed tiles, concrete geometry/style differences and diff PNGs. Domain outcomes use `VerificationResult`. |
| 9: root package structure | Root skill/README/LICENSE/AGENTS/package/tsconfig, agents metadata, scripts, references, src, fixtures and GitHub workflow. Tests are colocated, following AGENTS.md. No nested subskills or conventional application entrypoint were added. |
| 10: commands/contracts/safe reruns | All documented phase commands exercised through CLI or integration APIs; reconstruction `--shadcn` smoke check passes. Zod capture/raw/IR/index/task/policy/report schemas are versioned. IDs are path-safe; bundle reads reject symlink escapes. Output refusal, append-only verification iterations, structured progress/errors and explicit evidence warnings are implemented and tested. |
| 11: tests/evaluation/CI | `UI_RE_INTEGRATION=1 npm test`: 17/17 pass, none skipped. Includes unit contracts/normalization/wrappers/visibility/assets/tokens/breakpoints/correspondence/pixels, real CDP integration and end-to-end control/mutation reports. `references/evaluation.md` supplies seven observable agent-behavior scenarios; these are documented scenarios, not claimed executed agent trials. CI runs preflight, skill checks, typecheck, build and all tests. |
| 12: README | README documents installation/activation, preflight/approval, architecture, commands, capture/IR, agent reconstruction, shadcn, verification, tests, limitations and extension APIs separately from the operational skill. |
| 13: operational workflow | Root skill names exact commands, gates setup on approval, links phase details only at use, requires inspection/implementation/verification/repair, freezes policy and states success/iteration-limit exits. |
| 14: security/replaceability | No captured host execution or model-provider dependency. Ephemeral sandboxed Chromium; deterministic declared browser actions. Explicit FrameworkAdapter, CaptureStrategy, PreprocessPass and PixelComparator interfaces. Tests cover adapter calls and path containment; website evidence is treated as untrusted in the skill/task guidance. |
| 15: run and inspect | Final preflight, skill check, typecheck, build and all 17 tests pass. `.runs/fixture-audited` was generated by the combined CLI and inspected: capture, IR, reconstruction preparation, render, target IR, verification and shadcn task. Desktop and mobile-dialog screenshots were viewed. |

## Final artifacts

- `.runs/fixture-audited/capture/capture.json`
- `.runs/fixture-audited/ir/manifest.json`
- `.runs/fixture-audited/reconstruction/TASK.md`
- `.runs/fixture-audited/shadcn-task/reconstruction.json`
- `.runs/fixture-audited/verification/iteration-001/report.json`
- `.runs/fixture-audited/verification/iteration-001/report.md`

## Scope of validation and known limits

The live tests ran locally on macOS with discovered Chrome; the GitHub Actions job is configured but was not run remotely because this workspace has no remote repository/workflow run. Its checks were executed locally. Dynamic content, browser/font rendering differences, container-query interpretation and out-of-session frames can require extra captures or agent diagnosis, as documented in the phase references. The fixture uses a controlled target, which the objective explicitly allows; agent reconstruction remains the skill consumer's work.

The installed skill-creator quick validator predates the current supported `compatibility` field and rejects it. The field is retained per the Agent Skills specification; this repository's dependency-free checker validates its scalar frontmatter and direct references successfully.
