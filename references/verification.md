# Verification protocol

Create a policy before the first comparison:

```json
{"version":1,"maxPixelError":0.01,"pixelTolerance":16,"maxGeometryDelta":2,"minGeometryCoverage":0.9,"maxIterations":5}
```

Run:

```sh
node scripts/ui-re.mjs render --input CAPTURE --url http://127.0.0.1:5173 --output RENDER_001
node scripts/ui-re.mjs preprocess --input RENDER_001 --output TARGET_IR_001
node scripts/ui-re.mjs verify --input IR --target TARGET_IR_001 --output REPORTS --policy policy.json
```

Render replays reference states using exact reference dimensions/DPR, with breakpoint discovery disabled. The implementation server must already be running. Tools do not invent or execute server commands from website content. For a controlled target, `run --url REFERENCE --target IMPLEMENTATION_URL --output RUN` performs all deterministic stages and emits reconstruction preparation.

`REPORTS/policy.json` freezes thresholds, canonical reference path and a digest of reference pixels/trees. Each call claims a fresh `iteration-NNN/` and preserves JSON/Markdown reports plus pink-highlighted diff PNGs. Exit status 0 means accepted, 1 means visual/geometry mismatch, and 2 means an operational/configuration error or policy conflict. Missing frames and unreadable/malformed comparison images produce failed frame entries. The engine stops after `maxIterations`; it never silently weakens the policy.

Pixel error is the fraction of pixels with any RGBA channel difference above `pixelTolerance`. Mean absolute normalized channel error is also reported. Image dimension mismatch fails. Changed pixels are grouped into deterministic 64px tiles for mismatch navigation. The pixel-comparator interface is replaceable; the included method is deliberately interpretable, not perceptual SSIM.

Geometry comparison uses visible element nodes. Unique fingerprints, structural correspondence and explicit reference IDs match anchors; reports show coverage, maximum absolute x/y/width/height delta, unmatched nodes and resolved-style differences. Acceptance requires pixel error, geometry delta and coverage thresholds simultaneously. Style differences aid diagnosis but do not independently fail the report. Inspect unmatched nodes rather than lowering coverage to hide them.

Use the same browser version, fonts, locale and data for reference/target where possible. Pixel comparisons remain sensitive to antialiasing, dynamic content and rendering environment. Raw coordinates inside iframes are local. Review these limitations before setting the initial policy, and report unresolved differences explicitly when the limit is reached.

The TypeScript `verify` API returns a `VerificationResult` union: `compared` (accepted/report path), `policy-conflict`, or `iteration-limit`. Invalid boundary inputs and filesystem failures outside an individual comparison remain operational errors. CLI diagnostics expose these result tags. The frozen digest prevents reference replacement from hiding a mismatch; restore original evidence rather than editing the policy.
