# Draftsmith

AI writing agent for technical articles in [iostom's](https://medium.com/@osintiostom) hands-on tutorial style. Exports to Medium, tommarler.com, and X.

Linear project: [Draftsmith](https://linear.app/pokepitchshop/project/draftsmith-7075cfe872a1)

GitHub: [github.com/pokepitchshop/Draftsmith](https://github.com/pokepitchshop/Draftsmith)

Local path: `~/Desktop/pokepitchshop/draftsmith`

## Workflow

| Step | Prompt / Script | Output |
|------|-----------------|--------|
| **Link → draft** | `scripts/prepare-link-draft.mjs` | `source-material.md` + `manifest.yaml` |
| | `prompts/07-draft-from-link.md` | `articles/drafts/{slug}/draft.md` |
| 0. Series plan | `prompts/00-series-plan.md` | `series/{series-slug}/manifest.yaml` |
| 1. Outline | `prompts/01-outline.md` | `articles/drafts/{slug}/outline.md` |
| 2. Draft | `prompts/02-draft.md` | `articles/drafts/{slug}/draft.md` |
| 3. Self-edit | `prompts/03-self-edit.md` | `articles/drafts/{slug}/draft-v2.md` |
| 4. Export | `prompts/04-export-medium.md` | `export/medium/{slug}.md` |
| | `prompts/05-export-tommarler.md` | `export/tommarler/{slug}.md` |
| | `prompts/06-export-x.md` | `export/x/{slug}/thread.md` + `single.md` |

Set channels per article in `articles/drafts/{slug}/manifest.yaml`. Run only export prompts for selected channels.

Publish steps: [`docs/publish-checklist.md`](docs/publish-checklist.md)

## Quick start

1. Open this repo in Cursor (`AGENTS.md` loads automatically).
2. Create or fill `articles/drafts/{slug}/manifest.yaml` (see `templates/manifest-template.yaml`).
3. Run prompts in order through self-edit.
4. Export to selected channels; follow the publish checklist.

## Key files

| Path | Purpose |
|------|---------|
| `AGENTS.md` | Persona and voice for Cursor |
| `style/iostom-style-guide.md` | Technical article voice (POK-371) |
| `docs/style-guide.md` | Style guide workflow and self-edit quick reference |
| `docs/link-ingestion.md` | URL → source material router (POK-419) |
| `docs/link-to-article.md` | Drop a link → draft workflow (POK-421) |
| `docs/manifest-schema.md` | Manifest field reference + validation (POK-420) |
| `schemas/article-manifest.schema.json` | JSON Schema for article manifests (POK-420) |
| `scripts/lib/manifest-schema.mjs` | Manifest parse, validate, and build helpers |
| `prompts/07-draft-from-link.md` | Draft from ingested source material |
| `templates/source-material-template.md` | Ingested source material format |
| `style/x-social-guide.md` | X thread/single tweet rules |
| `docs/x-export.md` | X export workflow and validation |
| `templates/manifest-template.yaml` | Per-article channel selection |
| `templates/outline-template.md` | Outline structure |
| `templates/article-template.md` | Full draft structure |
| `templates/export-*.md` | Export format references |
| `metrics/articles.yaml` | Per-channel engagement tracking |
| `references/medium-articles.md` | iostom source article catalog (POK-371) |
| `docs/series-planning.md` | Multi-part series workflow (POK-374) |
| `series/` | Series manifests (`series/{slug}/manifest.yaml`) |

## Series planning (POK-374)

For multi-part topics, run `prompts/00-series-plan.md` first. Validate with:

```bash
node scripts/validate-series.mjs go-gorilla-mux
```

See [`docs/series-planning.md`](docs/series-planning.md).

## Style guide (POK-371)

Codified from iostom's Medium articles (Pyenv/Poetry, Gorilla Mux, Python OSINT scraping). See [`docs/style-guide.md`](docs/style-guide.md) and [`style/iostom-style-guide.md`](style/iostom-style-guide.md).

## Link ingestion (POK-419)

Drop a link → clean source markdown for the link-to-article workflow:

```bash
node scripts/ingest-link.mjs https://github.com/gorilla/mux
node scripts/ingest-link.mjs <url> --out articles/drafts/{slug}/source-material.md
```

Python optional (YouTube + trafilatura fallback): `pip install -r scripts/requirements-ingest.txt`

See [`docs/link-ingestion.md`](docs/link-ingestion.md).

## Link-to-article (POK-421)

Drop a link → draft in iostom's voice:

```bash
node scripts/prepare-link-draft.mjs https://github.com/gorilla/mux --slug go-gorilla-mux-url-params --angle "Show path variables with mux.Vars"
```

Then run `prompts/07-draft-from-link.md` in Cursor. Sample: `articles/drafts/go-gorilla-mux-url-params/`.

See [`docs/link-to-article.md`](docs/link-to-article.md) and [`docs/manifest-schema.md`](docs/manifest-schema.md).

## X export (POK-379)

After long-form publish, set `canonical_url` in the manifest and run `prompts/06-export-x.md`. Validate with:

```bash
node scripts/validate-x-export.mjs go-gorilla-mux-part-1
```

See [`docs/x-export.md`](docs/x-export.md).

## Sample article

`articles/drafts/go-gorilla-mux-part-1/` includes outline, draft-v2, manifest, and sample exports in `export/`.

## Repository structure

Bootstrap layout for the Draftsmith writing system (POK-377):

```text
draftsmith/
├── AGENTS.md                 # Cursor persona (from Linear iostom prompt)
├── README.md
├── style/                    # Voice and export rules
├── templates/                # Outline, article, manifest, series, export formats
├── prompts/                  # 01 outline → 06 export (step-by-step Cursor prompts)
├── articles/
│   ├── drafts/{slug}/        # outline, draft, draft-v2, manifest.yaml
│   └── published/            # post-review copies
├── export/
│   ├── medium/
│   ├── tommarler/
│   └── x/
├── series/                   # multi-part series manifests
├── schemas/                  # article-manifest.schema.json (POK-420)
├── metrics/                  # per-channel engagement (POK-376)
├── references/               # source article links
└── docs/                     # publish-checklist.md, manifest-schema.md, …
```

Open this folder in Cursor — `AGENTS.md` loads automatically for every session.
