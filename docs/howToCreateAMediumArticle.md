# How to create a Medium article

Step-by-step instructions for publishing to [Medium (@osintiostom)](https://medium.com/@osintiostom) using Draftsmith.

**Prerequisites:** Open the `draftsmith` folder in Cursor so `AGENTS.md` loads.

**Important:** Run **scripts in the terminal**. Run **prompts in Cursor chat** — do not run `prompts/*.md` files in zsh.

---

## Choose your starting point


| Path                                        | When to use                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| **[A) From a URL](#path-a-from-a-url)**     | You have a link (docs, blog, GitHub repo) and want an article inspired by it     |
| **[B) From scratch](#path-b-from-scratch)** | You have a topic and want an outline-first article (optionally part of a series) |


Both paths converge at **self-edit → Medium export → paste into Medium**.

---

## Path A: From a URL

Example: turn [https://cursor.com/docs/rules](https://cursor.com/docs/rules) into a Medium post.

### Step 1 — Ingest the link and scaffold the draft folder

In the terminal:

```bash
cd ~/Desktop/pokepitchshop/AiBusiness/draftsmith

node scripts/prepare-link-draft.mjs https://cursor.com/docs/rules \
  --slug cursor-project-rules \
  --channels medium \
  --angle "Set up .cursor/rules and AGENTS.md on a real repo — what I tried and what stuck"
```

Creates:

```text
articles/drafts/cursor-project-rules/
├── manifest.yaml
└── source-material.md
```

Validate:

```bash
node scripts/validate-manifest.mjs cursor-project-rules
```

### Step 2 — Draft in Cursor chat

> Follow `prompts/07-draft-from-link.md` for slug `cursor-project-rules`.

Output: `articles/drafts/cursor-project-rules/draft.md`

### Step 3 — Continue at [Common steps](#common-steps-self-edit--export--publish)

---

## Path B: From scratch

Example: a new Gorilla Mux series part or any original topic.

### Step 1 (optional) — Plan a series

For multi-part topics, in Cursor chat:

> Follow `prompts/00-series-plan.md` for topic **Go HTTP routing with Gorilla Mux**, series slug **go-gorilla-mux**, 3 parts.

See `[docs/series-planning.md](series-planning.md)`.

### Step 2 — Create the manifest

Copy `templates/manifest-template.yaml` to `articles/drafts/{slug}/manifest.yaml`.

Set at minimum:

```yaml
slug: my-article-slug
title: "Your article title"
channels:
  - medium
```

### Step 3 — Outline in Cursor chat

> Follow `prompts/01-outline.md` for slug `my-article-slug`, topic **…**, channels **medium**.

Output: `articles/drafts/{slug}/outline.md`

### Step 4 — Draft in Cursor chat

> Follow `prompts/02-draft.md` for slug `my-article-slug`.

Output: `articles/drafts/{slug}/draft.md`

### Step 5 — Continue at [Common steps](#common-steps-self-edit--export--publish)

---

## Common steps: self-edit → export → publish

### Step 1 — Self-edit

In Cursor chat:

> Follow `prompts/03-self-edit.md` for slug `{slug}`.

Output: `articles/drafts/{slug}/draft-v2.md`  
Manifest: `status: review`

### Step 2 — Export for Medium

In Cursor chat:

> Follow `prompts/04-export-medium.md` for slug `{slug}`.

Output: `export/medium/{slug}.md`  
Manifest: `status: exported`

Only run this if `medium` is listed under `channels` in the manifest.

### Step 3 — Paste into Medium

1. Open `export/medium/{slug}.md` and do a final read for voice and accuracy.
2. Go to [medium.com/new-story](https://medium.com/new-story).
3. Paste the markdown into the Medium editor.
4. Upload images at each `<!-- image: ... -->` comment (these replace `[Screenshot: ...]` placeholders from the draft).
5. Add tags and publish settings as you normally would on Medium.
6. Publish and copy the live URL.

### Step 4 — Update the manifest

Edit `articles/drafts/{slug}/manifest.yaml`:

```yaml
status: published
published:
  medium: https://medium.com/@osintiostom/your-post-url
```

If this article will drive X promotion later, set `canonical_url` when you also publish on tommarler.com (or use the Medium URL as canonical if Medium is primary).

### Step 5 (optional) — Promote on X

After `canonical_url` is set and `x` is in `channels`:

1. Run `prompts/06-export-x.md` in Cursor chat.
2. Validate: `node scripts/validate-x-export.mjs {slug}`
3. Post manually as @iostom.

See `[docs/x-export.md](x-export.md)`.

---

## Quick reference


| Step              | Where       | Command / prompt                                                            |
| ----------------- | ----------- | --------------------------------------------------------------------------- |
| Ingest URL        | Terminal    | `node scripts/prepare-link-draft.mjs <url> --slug {slug} --channels medium` |
| Draft from link   | Cursor chat | `prompts/07-draft-from-link.md`                                             |
| Outline           | Cursor chat | `prompts/01-outline.md`                                                     |
| Draft             | Cursor chat | `prompts/02-draft.md`                                                       |
| Self-edit         | Cursor chat | `prompts/03-self-edit.md`                                                   |
| Medium export     | Cursor chat | `prompts/04-export-medium.md`                                               |
| Validate manifest | Terminal    | `node scripts/validate-manifest.mjs {slug}`                                 |
| Publish           | Browser     | [medium.com/new-story](https://medium.com/new-story)                        |


---

## Example in this repo

End-to-end link-to-article sample:

```text
articles/drafts/cursor-project-rules/
├── manifest.yaml
├── source-material.md
├── draft.md
└── draft-v2.md

export/medium/cursor-project-rules.md   ← paste this into Medium
```

---

## Related docs

- `[docs/publish-checklist.md](publish-checklist.md)` — per-channel publish steps
- `[docs/link-to-article.md](link-to-article.md)` — link workflow details
- `[style/iostom-style-guide.md](../style/iostom-style-guide.md)` — voice and structure
- `[docs/style-guide.md](style-guide.md)` — self-edit checklist

