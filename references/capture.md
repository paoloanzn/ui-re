# Capture protocol

Run `node scripts/ui-re.mjs capture --url https://example.com --config config.json --output /workspace/evidence/capture-001`. Existing output directories are refused to preserve evidence; interrupted captures retain raw files but need a new output directory to retry. An intact `capture.json` is the phase completion marker.

Configuration is validated by `src/contracts/CaptureConfig.ts`:

```json
{
  "version": 1,
  "viewports": [{"width":390,"height":844,"dpr":1},{"width":1440,"height":900,"dpr":1}],
  "discoverBreakpoints": true,
  "maxDiscoveredViewports": 9,
  "states": [
    {"id":"default","actions":[]},
    {"id":"dialog","actions":[{"type":"click","selector":"button.subscribe"}]}
  ]
}
```

State IDs are unique lowercase path-safe names. `path` optionally specifies a route relative to the target URL. Actions are ordered `click`, `hover`, `fill` (selector/value), `press` (selector/key), `wait` (visible selector), or `scroll` (x/y). There is no arbitrary evaluation action. Agent reasoning chooses states; the capture engine only executes declared mechanics. Make selectors match both implementations, or call the render API with an explicit state mapping when markup differs.

The engine navigates once per state, applies actions, then resizes the same page within each DPR context. This preserves application state and backend-node correspondence where possible. Apps that replace or reset state on resize require separate configured captures. Different DPRs use separate contexts. Default browser conditions: en-US, UTC, light scheme, reduced motion, blocked service workers; fonts settle before capture. Browser and Playwright versions are recorded. Time-dependent content, video, canvas and application data may remain nondeterministic.

Media CSS width thresholds add representative widths immediately below/at/above the threshold, bounded by `maxDiscoveredViewports`. Explicit viewports remain included; set discovery false for exact overrides. Container queries are preserved as evidence, not translated into viewport widths. em/rem thresholds assume initial 16px; inspect relative-unit or compound queries before relying on sampled transitions.

`capture.json` contains version/config/tool/browser metadata, assets, breakpoints, warnings and frame entries. `frames/ID.json` (raw-frame version 2) holds validated DOMSnapshot/AX evidence and a `css-archive-v1` index. `css.matched` lists per-element records; `$cssObject` references point to shared rule/style objects, and stylesheet entries link `.css` text files. All paths are relative to the capture bundle. The archive retains all CDP fields without accumulating all element replies in memory. `createCssReader` can expand raw references on demand; version-1 inline frames remain supported by preprocessing. `frames/ID.png` is a full-page screenshot. `frames/ID.mhtml` is an archive (`.html` fallback recorded in warnings). `assets/` holds fetched image/font/media bytes, with unavailable or oversized responses recorded in the manifest.

DOMSnapshot is the structural authority: decode string-table indices and layout-node indices separately. `src/core/computedStyles.ts` defines ordered styles; layout bounds preserve resolved geometry while matched CSS retains authored sizing. Accessibility uses backendDOMNodeId to associate roles/names. CDP CSS includes matched rules, media queries, stylesheet text, platform fonts and rule usage. Experimental protocol failures become warnings when evidence is optional; structural/AX failures stop capture. CSS protocol requests use `timeoutMs` deadlines; a timeout stops capture with the method and frame in the diagnostic, rather than treating an unresponsive session as missing optional evidence. Storage failures also stop capture.

Use an isolated browser profile and avoid authenticated or sensitive targets unless the user requested them. Captures can contain personal data; keep output within the authorized workspace. No captured scripts are executed outside Chromium. Chromium sandboxing is enabled; setup does not change OS sandbox policy.

Capture strategies implement `src/ports/CaptureStrategy.ts` and can be passed as `CaptureDependencies.strategy`. The default `domSnapshotStrategy` requests the documented ordered styles; replacements must return that same versioned Snapshot contract and style ordering. The chosen strategy ID is recorded in the bundle. Child-document AX trees are collected when accessible to the session; frames outside that snapshot session generate an explicit warning and require a separate authorized capture.

Do not reduce viewport coverage to work around a large CSS frame: CSS storage is external and deduplicated by default. `capture-css` progress records report completed/total elements during long scans. Screenshots run before DOMSnapshot: disabling animations for a screenshot can replace pseudo-elements and invalidate their backend IDs. Structure, accessibility and CSS are then collected from the resulting page. Screenshots and archives are saved before the slower CSS scan.
