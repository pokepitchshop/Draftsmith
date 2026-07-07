# Link-to-article workflow (POK-421)

Drop a URL → ingest source material → draft in iostom's voice → self-edit → export.

Ref: [Link-to-Article Drafting Prompt](https://linear.app/pokepitchshop/document/draftsmith-link-to-article-drafting-prompt-0eba2fbc21fd)

## Pipeline

```text
draftsmith.mjs new <url>  →  manifest.yaml + source-material.md + handoff.md
        ↓
07-draft-from-link       →  draft.md
        ↓
03-self-edit             →  draft-v2.md
        ↓
04–06 export             →  export/{channel}/...
```

## Step 1 — Drop a link (recommended)

```bash
node scripts/draftsmith.mjs new https://github.com/gorilla/mux \
  --slug go-gorilla-mux-url-params \
  --channels medium,tommarler,x \
  --angle "Show path variables with mux.Vars in a tiny Go API"
```

See [`docs/drop-link.md`](drop-link.md) for auto-slug and `--json` output.

**Lower-level scaffold** (explicit slug only):

```bash
node scripts/prepare-link-draft.mjs https://github.com/gorilla/mux \
  --slug go-gorilla-mux-url-params \
  --channels medium,tommarler,x \
  --angle "Show path variables with mux.Vars in a tiny Go API"
```

Creates:

```
articles/drafts/{slug}/
├── manifest.yaml        # source_url, link_type, channels, angle
├── source-material.md   # router output
└── handoff.md           # ordered Cursor prompts (POK-426)
```

Or ingest only:

```bash
node scripts/ingest-link.mjs <url> --out articles/drafts/{slug}/source-material.md
```

See [`docs/link-ingestion.md`](link-ingestion.md).

## Step 2 — Draft in Cursor

Open the repo in Cursor and run:

> Follow `prompts/07-draft-from-link.md` for slug `go-gorilla-mux-url-params`.

The agent reads manifest + source material and writes `draft.md` using the **learn from, don't copy** guardrails.

## Step 3 — Validate

```bash
node scripts/validate-manifest.mjs go-gorilla-mux-url-params
```

## Step 4 — Self-edit and export

Continue the normal pipeline:

1. `prompts/03-self-edit.md` → `draft-v2.md`
2. Export prompts matching manifest `channels`
3. [`docs/publish-checklist.md`](publish-checklist.md)

## Manifest fields (link-to-article)

| Field | Purpose |
|-------|---------|
| `source_url` | Original dropped link |
| `link_type` | `article` \| `docs` \| `blog` \| `github` \| `youtube` — auto-filled by router |
| `angle` | Optional one-liner steering the draft |
| `channels` | Export destinations |
| `series` / `part` | Optional series linkage |

Full schema: [`docs/manifest-schema.md`](manifest-schema.md)

## Sample (POK-421 acceptance)

`articles/drafts/go-gorilla-mux-url-params/` — end-to-end test from `https://github.com/gorilla/mux`:

- Ingested via GitHub API (README + file tree)
- Draft written in iostom voice with re-derived code examples
- Source credited in related links

Human review checklist:

- [ ] Sounds like iostom, not a summary of the README
- [ ] Code examples are yours, not copied blocks from source material
- [ ] Source URL in "Please checkout the below links"
- [ ] Question headings, screenshots, sign-off ritual present

## Related

- [POK-426](https://linear.app/pokepitchshop/issue/POK-426/define-the-drop-a-link-input-interface-trigger) — drop-link CLI
- [POK-419](https://linear.app/pokepitchshop/issue/POK-419/build-link-ingestion-router-url-clean-markdown) — link router
- [POK-420](https://linear.app/pokepitchshop/issue/POK-420/define-the-article-manifest-schema) — manifest schema
- [POK-421](https://linear.app/pokepitchshop/issue/POK-421/wire-drafting-prompt-into-pipeline-validate-against-a-real-link) — this workflow
