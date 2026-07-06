# Prompt: Draft article from a link

Use for the **drop a link → article** workflow. Run after `scripts/prepare-link-draft.mjs` or manual ingestion.

Pairs with `AGENTS.md` (iostom persona) and the [Link-to-Article drafting prompt](https://linear.app/pokepitchshop/document/draftsmith-link-to-article-drafting-prompt-0eba2fbc21fd).

## Instructions for the agent

Read these files in order:

1. **Manifest:** `articles/drafts/{slug}/manifest.yaml` — channels, `source_url`, `link_type`, `angle`, series
2. **Source material:** `articles/drafts/{slug}/source-material.md` — ingested markdown from the router
3. **Style:** `style/iostom-style-guide.md`
4. **Structure:** `templates/article-template.md`

## Input

| Field | Value |
|-------|-------|
| **Slug** | <!-- e.g. go-gorilla-mux-url-params --> |

## Output

Save to:

```
articles/drafts/{slug}/draft.md
```

Optionally save a lightweight outline to `articles/drafts/{slug}/outline.md` if it helps structure the draft — not required for link-to-article flow.

## CRITICAL — learn from, don't copy

The source material is **research**, not text to rewrite.

- Do **not** paraphrase the source paragraph-by-paragraph or mirror its structure.
- Write as iostom **actually trying/building the thing** ("learning in public"), not summarizing someone else's post.
- Never reproduce more than a short quoted phrase from the source.
- Re-derive every code example and command yourself; don't lift them verbatim unless it's a standard API call (`mux.Vars(r)`, `go get`, etc.).
- If a claim is load-bearing, verify it rather than trusting the source.
- Credit the source with a link in the "Please checkout the below links" list (`manifest.source_url`).

## Drafting rules

Use `manifest.angle` when set — it steers what you build/teach from the source.

### Structure (iostom voice)

1. **Title** — concrete, benefit- or question-led (can refine `manifest.title`).
2. **Opening** — context + real-world motivation; "what you'll learn" line.
3. **Question-style `##` headings** — "What is X?", "How do you Y?"
4. **Step-by-step** — runnable CLI/code with expected results.
5. **`[Screenshot: ...]`** placeholders after steps with visible output.
6. **Recap** + series teaser (if `series` set) + comment invite + related links (include source URL).
7. **Length** — short, focused (~2–6 min read). Skimmable.

### After drafting

- Update manifest `title` if you improved it.
- Leave `status: draft` — user runs `prompts/03-self-edit.md` next.

## Acceptance check

Before saving, verify:

- [ ] Voice matches `style/iostom-style-guide.md` (first-person, warm, practical)
- [ ] Source used for facts/ideas, not copied prose or structure
- [ ] Code examples are re-derived and runnable
- [ ] Source URL credited in related links
- [ ] Sign-off ritual present
- [ ] `node scripts/validate-manifest.mjs {slug}` would pass

## Pipeline next steps

```
07-draft-from-link  →  draft.md
03-self-edit        →  draft-v2.md
04–06 export        →  export/{channel}/{slug}.*
```

See [`docs/link-to-article.md`](../docs/link-to-article.md).
