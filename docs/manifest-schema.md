# Article manifest schema

Per-article contract for channel selection, link-to-article drafting, and publish tracking.

Linear: [POK-420](https://linear.app/pokepitchshop/issue/POK-420/define-the-article-manifest-schema)

Template: [`templates/manifest-template.yaml`](../templates/manifest-template.yaml)

Validate: `node scripts/validate-manifest.mjs {slug}`

## Fields

| Field | Required | Values | Notes |
|-------|----------|--------|-------|
| `slug` | yes | kebab-case | Folder name under `articles/drafts/` |
| `title` | yes | string | Article title |
| `source_url` | link drafts | URL | Original dropped link |
| `link_type` | link drafts | `article`, `docs`, `blog`, `github`, `youtube` | Auto-filled by router |
| `angle` | no | string | One-liner steering the draft |
| `channels` | yes | list | Any of: `medium`, `tommarler`, `x` |
| `canonical_url` | no | URL | Set after long-form publish |
| `series` | no | slug or `null` | Links to `series/{slug}/manifest.yaml` |
| `part` | no | number or `null` | Part number in series |
| `status` | yes | `draft`, `review`, `exported`, `published` | Pipeline stage |
| `published.*` | no | URL or `null` | Per-channel live URLs |

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
```

Companion file: `articles/drafts/{slug}/source-material.md` (from `scripts/prepare-link-draft.mjs` or `scripts/ingest-link.mjs`).

## Drafting prompt mapping

The [Link-to-Article drafting prompt](https://linear.app/pokepitchshop/document/draftsmith-link-to-article-drafting-prompt-0eba2fbc21fd) uses uppercase labels — map to manifest fields:

| Prompt label | Manifest field |
|--------------|----------------|
| `SOURCE_URL` | `source_url` |
| `LINK_TYPE` | `link_type` |
| `CHANNELS` | `channels` |
| `SERIES` | `series` + `part` (or `none`) |
| `ANGLE` | `angle` |

## Validation rules

`scripts/validate-manifest.mjs` checks:

- `slug` matches folder name
- `title` present
- `channels` non-empty; each channel is valid
- `link_type` valid when set
- `source_url` is a valid URL when set
- `status` is valid
- Warns if `source_url` set but `source-material.md` missing

## Workflow by draft type

| Type | How manifest is created |
|------|-------------------------|
| Outline-first | Copy template; fill manually before `prompts/01-outline.md` |
| Link-to-article | `scripts/prepare-link-draft.mjs` auto-generates manifest + source material |

See [`docs/link-to-article.md`](link-to-article.md).
