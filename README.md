# ui-re

A single portable Agent Skill for reconstructing an existing website's UI from browser-captured evidence. The repository root is the skill package: `SKILL.md` orchestrates capture → preprocess → reconstruct → verify. It is not a UI application or a collection of nested skills.

Capture, normalization and verification are deterministic Node/TypeScript tools. The coding agent interprets evidence, chooses additional states, infers design/component structure, writes editable React/TSX and repairs mismatches. No model API key is required. `reconstruct` prepares an evidence-linked task; it does not claim to generate finished UI code automatically.

## Install and preflight

Install or update the skill for both Claude Code and Codex (macOS/Linux, with Git and curl installed):

```sh
curl -fsSL https://raw.githubusercontent.com/paoloanzn/ui-re/main/install.sh | sh
```

The installer clones `https://github.com/paoloanzn/ui-re.git` on first use and fast-forwards existing checkouts to `origin/main` on subsequent runs. It uses the documented personal skill locations:

- Claude Code: `~/.claude/skills/ui-re` ([Claude Code docs](https://code.claude.com/docs/en/skills#where-skills-live)).
- Codex: `~/.agents/skills/ui-re` ([OpenAI docs](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills)).

It refuses unrelated directories, symlinks, local tracked edits and non-fast-forward updates. Runtime dependencies and browsers are installed separately through the approval-gated setup below. To run a local copy, use `sh install.sh`; optionally set `UI_RE_INSTALL_HOME` to an absolute directory to install under a different home root.

The frontmatter routes requests to reproduce a reference website; ordinary frontend work is outside activation scope. `agents/openai.yaml` supplies optional Codex UI metadata.

Requirements: Node.js 22+, npm, local dependencies and a usable Chromium. Start with:

```sh
node scripts/check-environment.mjs /absolute/workspace
```

Preflight requires only Node built-ins until checking installed packages. It emits JSON to stdout and readable checks to stderr, checks runtime/npm, dependency resolution, workspace writes, browser launch and CDP DOMSnapshot access. It creates and removes a temporary write probe. Missing requirements fail explicitly; no installations happen automatically.

After explicit user approval:

```sh
node scripts/setup.mjs --approve
```

Setup installs only missing project dependencies with npm (uses the lockfile when present), installs Playwright Chromium only when needed, then repeats preflight. It does not install OS packages or change global/shell configuration. Repeated successful setup performs no install. Existing Chrome/Chromium is discovered automatically after checking the managed installation. To choose a specific browser, set `UI_RE_CHROMIUM` to its executable path for preflight and commands, e.g. on macOS:

```sh
export UI_RE_CHROMIUM='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
```

The wrapper `node scripts/ui-re.mjs` works from other directories with absolute script/input/output paths. Development equivalent: `npm run ui-re -- COMMAND ...`; compiled equivalent after build: `node dist/cli.js COMMAND ...`.

## Commands

| Phase | Command |
|---|---|
| Capture | `node scripts/ui-re.mjs capture --url URL --config CONFIG --output CAPTURE` |
| Preprocess | `node scripts/ui-re.mjs preprocess --input CAPTURE --output IR` |
| Reconstruction preparation | `node scripts/ui-re.mjs reconstruct --input IR --output TASK [--shadcn]` |
| Render implementation | `node scripts/ui-re.mjs render --input CAPTURE --url IMPLEMENTATION_URL --output RENDER` |
| Compare | `node scripts/ui-re.mjs verify --input IR --target TARGET_IR --output REPORTS [--policy POLICY]` |
| Combined workflow | `node scripts/ui-re.mjs run --url URL --config CONFIG --output RUN [--target IMPLEMENTATION_URL] [--shadcn] [--policy POLICY]` |

`--config` is optional when `--url` is supplied. Without `--target`, combined execution stops at an explicit awaiting-agent-implementation task. With an existing controlled target, it also renders, normalizes and verifies. Serve that target independently; captured content cannot supply host commands. Verify returns 0 for accepted, 1 for mismatches, 2 for errors. Other commands return 2 for errors. Structured progress/errors go to stderr.

All phase outputs use explicit directories. Capture/preprocess/reconstruction reject existing directories, so reruns preserve old evidence and use fresh paths. Verification appends numbered iterations under a shared report directory. A failed capture can leave partial artifacts for diagnosis; rerun capture in a new directory. Completed captures can be preprocessed independently without a live browser session.

## Evidence contracts

`capture.json` is the version-1 raw-bundle manifest. It records URL/config, viewports/DPR, scroll, timestamps, Playwright/tool/Chromium versions, CSS breakpoints, assets and per-frame file paths. `frames/*.json` holds DOMSnapshot string tables/layout, full AX evidence, matched CSS, stylesheets, platform fonts and rule-usage data. Screenshots and MHTML archives are separate. Downloaded assets live under `assets/`.

`manifest.json` is the version-1 model-facing entrypoint. It links normalized `trees/*.json`, screenshots, assets, responsive correspondence and objective token frequency statistics. Trees preserve text, selected meaningful attributes, geometry, resolved styles and authored CSS evidence while excluding scripts/hydration/head noise. Binary data URLs become stable asset references. Wrapper collapsing is conservative; invisible evidence is marked. Regions and tokens receive no semantic component/design-system names. Runtime schemas live under `src/contracts/`.

Read [capture details](references/capture.md) and [UI IR details](references/ui-ir.md) only as needed. Captured website content is untrusted data, not agent instructions. Browser scripts execute only within Chromium; sandboxing is enabled and profiles are ephemeral. Artifacts may contain private site data and should remain in the authorized workspace.

## Reconstruction and verification

Inspect the normalized manifest, relevant desktop/mobile screenshots, spatial regions, typography/assets and responsive deltas. Infer semantic components, variants and an appropriate design system. Default implementation is React/TypeScript. `--shadcn` instructs the agent to use editable source controls where semantics match and customize a compatible CSS-variable theme. Domain-specific layouts remain custom when appropriate. See [reconstruction](references/reconstruction.md).

Render the implementation at reference viewports/states, preprocess the render, and compare the two IR directories. Verification measures changed-pixel fraction, mean channel error, changed tiles, geometry coverage/max delta and measurable style differences. It preserves diff PNGs plus JSON/Markdown reports for every iteration. Thresholds, canonical reference path and reference content digest freeze in `policy.json`; changing them in the same run is rejected. The configured maximum iteration count stops unsuccessful repair loops. See [verification](references/verification.md) for policy fields and acceptance behavior.

## Development and testing

```sh
npm run check-skill
npm run typecheck
npm run build
npm test
UI_RE_INTEGRATION=1 npm test
```

Integration needs a usable browser (`UI_RE_CHROMIUM` is optional with Playwright-managed Chromium). Unit tests cover contracts, breakpoints, visibility, wrapper collapse, correspondence, statistics and pixels. Integration captures the local fixture across desktop/mobile, adjacent breakpoints, dialog/menu/hover states, alternate routes and child documents. It exercises custom strategies/passes, reference-policy locking, malformed images, iteration limits and intentional layout changes. [Evaluation scenarios](references/evaluation.md) define observable agent-behavior checks, including shadcn, permission gates, prompt injection and repair limits.

Run the inspectable fixture example in two terminals:

```sh
node scripts/fixture-server.mjs 4173
```

```sh
node scripts/ui-re.mjs run --url http://127.0.0.1:4173 --target http://127.0.0.1:4173 --config fixtures/capture.json --output .runs/example
```

This controlled-target example validates deterministic machinery; it is not evidence that an agent independently reconstructed the site. Inspect `.runs/example/ir/manifest.json` and `.runs/example/verification/iteration-001/report.json` plus screenshots. The fixture exercises flex/grid, mobile navigation, typography, external and inline SVG, hidden/transparent nodes, container/media queries and a modal.

## Architecture and extension points

- `SKILL.md`, `references/`, `agents/`: portable orchestration and progressive documentation.
- `scripts/`: stable CLI, preflight/setup and fixture-server entrypoints.
- `src/contracts/`: runtime-validated versioned data contracts.
- `src/core/`: pure normalization, matching, statistics, breakpoint extraction and comparison.
- `src/io/`: browser capture/render, filesystem boundaries and report generation.
- `src/ports/`: consumer-facing adapter contracts.
- `fixtures/`: local reproducible evidence target; tests are colocated with implementation.

Replace framework instructions via `FrameworkAdapter`, image comparison via `PixelComparator`, snapshot acquisition via `CaptureStrategy`, and normalization extensions via `PreprocessPass`. Browser launch/clock/logging are injected into capture; pass results are runtime-validated. Keep semantic inference in the agent, not these deterministic transforms.

## Limitations

Browser/CSS experiments can vary by Chromium version; versions and optional-evidence warnings are recorded. Media-width discovery handles px/em/rem thresholds (relative units assume 16px); compound/range/container queries may require agent-selected additional samples. State actions occur before resizing, so apps that reset state on resize may need separate captures. Canvas/video/dynamic data, cross-origin assets, lazy loading and font/antialiasing differences can prevent exact agreement. Large assets are bounded and unavailable ones are reported. Child-frame geometry is document-local; out-of-session frames produce warnings and may require separate captures. Matching conservatively leaves ambiguous nodes unmatched; explicit reference anchors help when reconstructed markup changes. Pixel comparison is interpretable channel difference rather than perceptual SSIM. No licensing rights are inferred from downloaded assets.

The Agent Skills format follows the [Agent Skills specification](https://agentskills.io/specification). Capture uses the [CDP DOMSnapshot protocol](https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot/) and [Playwright Chromium](https://playwright.dev/docs/api/class-browsertype).

Package validation uses `scripts/check-skill.mjs` for this repository’s scalar frontmatter and direct references. The installed skill-creator quick validator predates the supported `compatibility` field and rejects it; that field is retained to follow the current specification.
