# Link ingestion (POK-419)

Turn a dropped URL into clean **source material** markdown for the link-to-article drafting workflow.

## Router

| `LINK_TYPE` | Detection | Engine |
|-------------|-----------|--------|
| `youtube` | youtube.com, youtu.be | `youtube-transcript-api` (Python) |
| `github` | github.com | GitHub REST API (README + file tree) |
| `docs` | docs.* hosts, `/docs/` paths | Jina Reader → trafilatura fallback |
| `blog` | medium.com, blog.*, `/blog/` | Jina Reader → trafilatura fallback |
| `article` | default | Jina Reader → trafilatura fallback |

## Usage

```bash
# Human-readable output
node scripts/ingest-link.mjs https://github.com/gorilla/mux

# JSON payload (for tooling / manifest paste)
node scripts/ingest-link.mjs https://example.com/blog/post --json

# Write source-material file
node scripts/ingest-link.mjs https://example.com/docs/guide --out articles/drafts/my-slug/source-material.md
```

## Output format

Frontmatter + markdown body, ready for the [Link-to-Article drafting prompt](https://linear.app/pokepitchshop/document/draftsmith-link-to-article-drafting-prompt-0eba2fbc21fd):

```yaml
---
source_url: https://...
link_type: github
title: "owner/repo"
ingested_at: 2026-07-06T...
engine: github-api
---

# Content...
```

Paste into manifest fields (`SOURCE_URL`, `LINK_TYPE`) and the drafting prompt's **SOURCE MATERIAL** block.

## Setup

**Node** (required) — uses built-in `fetch`; no npm install.

**Python** (optional fallbacks):

```bash
pip install -r scripts/requirements-ingest.txt
```

Needed for:
- YouTube transcripts (`youtube-transcript-api`)
- Article fallback when Jina Reader fails (`trafilatura`)

## Environment variables

| Variable | Purpose |
|----------|---------|
| `GITHUB_TOKEN` | Higher rate limits for GitHub API |
| `JINA_API_KEY` | Authenticated Jina Reader requests |

## Acceptance (POK-419)

Given any supported link type, the router returns markdown with nav/boilerplate stripped:

- [ ] `article` / `docs` / `blog` — main content via Jina or trafilatura
- [ ] `github` — README + file tree, not rendered GitHub HTML
- [ ] `youtube` — plain transcript text

## Related

- Linear: [POK-419](https://linear.app/pokepitchshop/issue/POK-419/build-link-ingestion-router-url-clean-markdown)
- Blocks: POK-420 (manifest schema), POK-421 (wire drafting prompt)
- Template: `templates/source-material-template.md`
