# Article manifest schema

Per-article contract for channel selection, link-to-article drafting, and publish tracking. This is the contract the ingestion router writes and the drafting prompts read.

Linear: [POK-420](https://linear.app/pokepitchshop/issue/POK-420/define-the-article-manifest-schema)

| Resource | Path |
|----------|------|
| Template | [`templates/manifest-template.yaml`](../templates/manifest-template.yaml) |
| JSON Schema | [`schemas/article-manifest.schema.json`](../schemas/article-manifest.schema.json) |
| Parser / validator | [`scripts/lib/manifest-schema.mjs`](../scripts/lib/manifest-schema.mjs) |
| CLI | `node scripts/validate-manifest.mjs {slug}` or `--all` |

## Fields

| Field | Required | Values | Notes |
|-------|----------|--------|-------|
| `slug` | yes | kebab-case | Must match folder name under `articles/drafts/` |
| `title` | yes | string | Article title |
| `source_url` | link drafts | URL | Original dropped link |
| `link_type` | link drafts | `article`, `docs`, `blog`, `github`, `youtube` | Required when `source_url` is set; auto-filled by router |
| `angle` | no | string | One-liner steering the draft |
| `channels` | yes | list | Any of: `medium`, `tommarler`, `x` |
| `canonical_url` | no | URL | Set after long-form publish (required for X export) |
| `series` | no | slug or `null` | Links to `series/{slug}/manifest.yaml` |
| `part` | no | number or `null` | Required when `series` is set |
| `status` | yes | see below | Pipeline stage |
| `published.*` | no | URL or `null` | Per-channel live URLs |

### Status lifecycle

```text
draft → review → exported → published
```

| Status | Meaning |
|--------|---------|
| `draft` | Initial state after outline or link scaffold |
| `review` | Self-edit complete (`draft-v2.md`) |
| `exported` | Channel export files written |
| `published` | Live on at least one channel; set `published.{channel}` URLs |

### Published block

```yaml
published:
  medium: null
  tommarler: null
  x: null
```

When `status: published`, at least one URL under `published` for a listed `channels` entry is required.

## Link-to-article manifest block

```yaml
slug: go-gorilla-mux-url-params
title: "How do you read URL params with Gorilla Mux?"
source_url: https://github.com/gorilla/mux
link_type: github
angle: "Show path variables with mux.Vars in a tiny Go API"
channels:
  - medium
  - tommarler
  - x
canonical_url: null
series: null
part: null
status: draft
published:
  medium: null
  tommarler: null
  x: null
```

Companion file: `articles/drafts/{slug}/source-material.md` (from `scripts/prepare-link-draft.mjs` or `scripts/ingest-link.mjs`).

## Series part manifest

```yaml
slug: go-gorilla-mux-part-1
title: "What is Gorilla Mux? (Go HTTP Routing — Part 1)"
channels:
  - medium
  - tommarler
  - x
series: go-gorilla-mux
part: 1
status: draft
published:
  medium: null
  tommarler: null
  x: null
```

When `series` is set, `part` must be a positive integer. See [`docs/series-planning.md`](series-planning.md).

## Drafting prompt mapping

The [Link-to-Article drafting prompt](https://linear.app/pokepitchshop/document/draftsmith-link-to-article-drafting-prompt-0eba2fbc21fd) uses uppercase labels — map to manifest fields:

| Prompt label | Manifest field |
|--------------|----------------|
| `SOURCE_URL` | `source_url` |
| `LINK_TYPE` | `link_type` |
| `CHANNELS` | `channels` |
| `SERIES` | `series` + `part` (or `null`) |
| `ANGLE` | `angle` |

## Validation

`node scripts/validate-manifest.mjs {slug}` checks:

- `slug` matches folder name and kebab-case pattern
- `title` present
- `channels` non-empty; each channel is valid
- `link_type` valid; required when `source_url` is set
- `source_url` and `canonical_url` are valid URLs when set
- `series` / `part` consistency
- `status` is valid; `published` URLs required when status is `published`
- Warns if `source_url` set but `source-material.md` missing

Validate every draft folder:

```bash
node scripts/validate-manifest.mjs --all
```

## Workflow by draft type

| Type | How manifest is created |
|------|-------------------------|
| Outline-first | Copy [`templates/manifest-template.yaml`](../templates/manifest-template.yaml); fill before `prompts/01-outline.md` |
| Link-to-article | `scripts/prepare-link-draft.mjs` auto-generates manifest + source material |

See [`docs/link-to-article.md`](link-to-article.md).
