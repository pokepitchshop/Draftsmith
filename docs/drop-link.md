# Drop a link (POK-426)

The v1 **front door** for the link-to-article pipeline. One CLI command takes a URL plus manifest fields, runs the ingestion router, writes the manifest, and returns a handoff with Cursor prompts — no manual file editing.

Linear: [POK-426](https://linear.app/pokepitchshop/issue/POK-426/define-the-drop-a-link-input-interface-trigger)

## v1 trigger: CLI

```bash
node scripts/draftsmith.mjs new <url> [options]
```

Alias for the same script:

```bash
node scripts/draftsmith.mjs new https://cursor.com/docs/rules \
  --channels medium \
  --angle "Set up .cursor/rules on a real repo — what I tried and what stuck"
```

Slug is **auto-derived** from the URL when `--slug` is omitted (`cursor-project-rules` from the example above). Pass `--slug` to override.

### Options

| Flag | Purpose |
|------|---------|
| `--slug <slug>` | kebab-case folder name (auto if omitted) |
| `--title <title>` | Article title (default: from ingestion) |
| `--channels <list>` | `medium`, `tommarler`, `x` (comma-separated; default: `medium`) |
| `--angle <text>` | One-liner steering the draft |
| `--series <slug>` | Series slug |
| `--part <n>` | Part number when in a series |
| `--engine <engine>` | `auto`, `jina`, or `trafilatura` |
| `--json` | Machine-readable summary on stdout |

## What it does

```text
draftsmith new <url>
        ↓
  POK-419  ingest-link router     →  source-material.md
  POK-420  manifest schema        →  manifest.yaml
  POK-426  handoff + validation   →  handoff.md
        ↓
  Cursor: prompts/07 → 03 → 04–06   →  draft + exports
```

### Output location

```text
articles/drafts/{slug}/
├── manifest.yaml        # channels, source_url, link_type, angle, series
├── source-material.md   # ingested markdown
└── handoff.md           # ordered Cursor chat steps
```

Exports land under `export/{channel}/{slug}.*` after you run the export prompts in Cursor.

## Cursor steps (not shell)

Open `handoff.md` or paste the first prompt from the CLI output:

> Follow `prompts/07-draft-from-link.md` for slug `{slug}`.

Then self-edit and export prompts listed in `handoff.md` for each channel in `manifest.channels`.

Prompts run in **Cursor chat only** — do not execute `prompts/*.md` in the terminal.

## Check pipeline progress

```bash
node scripts/draftsmith.mjs status <slug>
```

Shows which files exist (`draft.md`, `draft-v2.md`, exports) and the next Cursor prompt.

## JSON output

For tooling or automation hooks:

```bash
node scripts/draftsmith.mjs new https://github.com/gorilla/mux --json
```

Returns paths, slug, channels, and the full `cursor_prompts` array on stdout.

## Lower-level scripts

| Script | When to use |
|--------|-------------|
| `scripts/draftsmith.mjs new` | **Default** — drop a link with auto slug + handoff |
| `scripts/prepare-link-draft.mjs` | Explicit `--slug` without handoff extras |
| `scripts/ingest-link.mjs` | Ingest only, no manifest |

## Future triggers (not v1)

Considered but deferred: watched inbox folder, Slack message, Linear issue webhook. v1 is CLI-only so the contract is stable before adding surfaces.

## Related

- [`docs/link-to-article.md`](link-to-article.md) — full pipeline
- [`docs/manifest-schema.md`](manifest-schema.md) — manifest fields
- [`docs/link-ingestion.md`](link-ingestion.md) — router details
- [POK-419](https://linear.app/pokepitchshop/issue/POK-419) · [POK-420](https://linear.app/pokepitchshop/issue/POK-420) · [POK-421](https://linear.app/pokepitchshop/issue/POK-421)
