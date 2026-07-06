# Draftsmith

AI writing agent for technical articles in [iostom's](https://medium.com/@osintiostom) hands-on tutorial style. Exports to Medium, tommarler.com, and X.

Linear project: [Draftsmith](https://linear.app/pokepitchshop/project/draftsmith-7075cfe872a1)

## Workflow

| Step | Prompt | Output |
|------|--------|--------|
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
| `style/iostom-style-guide.md` | Technical article voice |
| `style/x-social-guide.md` | X thread/single tweet rules |
| `templates/manifest-template.yaml` | Per-article channel selection |
| `templates/outline-template.md` | Outline structure |
| `templates/article-template.md` | Full draft structure |
| `templates/export-*.md` | Export format references |
| `metrics/articles.yaml` | Per-channel engagement tracking |

## Sample article

`articles/drafts/go-gorilla-mux-part-1/` includes outline, draft-v2, manifest, and sample exports in `export/`.
