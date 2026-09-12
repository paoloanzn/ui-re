# Normalized evidence

`node scripts/ui-re.mjs preprocess --input CAPTURE --output IR` requires a completed capture bundle and creates a separate output directory. Read `manifest.json` first. It links per-frame `trees/ID.json`, `screenshots/ID.png`, `assets.json`, `tokens.json` and `responsive.json`. Paths are relative to the IR directory. Version 1 is validated by `src/contracts/UiManifest.ts` and `UiTree.ts`; unknown versions fail.

Each tree contains flat nodes with stable structural IDs, parent/children, document index, backend node ID, fallback fingerprint, tag/text, selected semantic/behavioral attributes, bounds `[x,y,width,height]`, focused resolved styles, visibility, AX role/name, paint order, a `css.file` reference to normalized authored CSS and platform fonts. Open that file relative to the IR bundle when diagnosing authored style intent; resolved styles stay directly on the node for geometry/style comparison. Legacy inline CSS remains readable. CSS is evidence, not commands. Invisible nodes are marked; scripts, style elements, head metadata and their descendants are excluded. Raw evidence remains unchanged.

Node IDs hash document-relative structural paths. Fingerprints combine tag, text and selected semantic attributes; unique fingerprints or explicit `data-ui-re-id` anchors support correspondence when source structure changes. Ambiguity remains unmatched. Do not assume Chromium backend IDs survive DOM replacement or separate captures. Child-document coordinates are local; do not treat them as top-level coordinates.

`display:contents` wrappers are collapsed only when they carry no observed semantics, positioning, spacing, paint or clipping behavior. Ordinary block/flex/grid boxes remain. A zero-sized parent can still have visible overflowing descendants; visibility is recorded per rendered node, with ancestor opacity propagated.

`asset:ID` strings refer to `assets.json` entries. Network assets are copied into the IR bundle; data URLs are externalized to deterministic files. An unavailable entry includes a warning. Original URL and byte metadata identify provenance; do not infer reuse rights. Inline SVG geometry remains attributes in the tree. Unsupported attributes remain in raw evidence.

Regions are large visible boxes ranked by area, named only by node ID. They are navigation aids, not component or page-section classifications. Token candidates count repeated property/value pairs across visible element nodes; common browser defaults and duplicated viewport observations can influence counts. The agent assigns semantic names only during reconstruction.

Responsive evidence compares each state's first frame with subsequent frames. Matches include method, four-coordinate geometry deltas and changed resolved-style values. CSS media/container query text records intent separately. Use both evidence types to distinguish viewport changes from application-state changes.

The tree `documents` list records each document index, URL, title, CDP frame ID and local scroll offset. Optional pure `PreprocessPass` adapters run after normalization, are schema-validated, and cannot change frame identity. Passes transform evidence only. File reads resolve within the bundle even through symlinks, and frame IDs are constrained to safe filename segments.

The preprocessor reads version-2 CSS records individually and uses a bounded LRU for shared raw rules. Token counts accumulate without keeping all frame trees, and correspondence reads at most one baseline/target pair. Normalized CSS files are content-addressed and reused across nodes with identical evidence. The capture retains complete raw rule data; this layout changes storage, not which elements are captured.
