# Publish checklist

Per-destination manual steps after export. Human review required before every publish.

## Before any export

1. Outline approved → `articles/drafts/{slug}/outline.md`
2. Draft written → `prompts/02-draft.md` → `draft.md`
3. Self-edit complete → `prompts/03-self-edit.md` → `draft-v2.md`
4. Manifest channels set → `articles/drafts/{slug}/manifest.yaml`

Run only the export prompts matching manifest `channels`.

---

## Medium

**Prompt:** `prompts/04-export-medium.md`  
**Output:** `export/medium/{slug}.md`

1. Open export file; final read for voice and accuracy
2. Paste into Medium editor (https://medium.com/new-story)
3. Upload images at `<!-- image: ... -->` markers
4. Publish; copy live URL
5. Update manifest: `published.medium: {url}`

---

## tommarler.com

**Prompt:** `prompts/05-export-tommarler.md`  
**Output:** `export/tommarler/{slug}.md`

1. Copy export → `personalWebsite/content/blog/{slug}.md`
2. Run `npm run build` in personalWebsite
3. Upload `dist/` to Hostinger `public_html`
4. Verify `https://tommarler.com/blog/{slug}/`
5. Update manifest: `published.tommarler: {url}` and `canonical_url` if primary

---

## pokepitchshop.com

**Prompt:** `prompts/06-export-pokepitchshop.md`  
**Output:** `export/pokepitchshop/{slug}.mdx`

1. Copy export → `pokepitchshop/content/blog/{slug}.mdx`
2. Add slug to `RELATED_POST_SLUGS` in `lib/blog/posts.ts`
3. Set `status: "published"` in `lib/blog/content-calendar.ts`
4. Commit and push → Vercel deploy
5. Verify `https://pokepitchshop.com/blog/{slug}`
6. Update manifest: `published.pokepitchshop: {url}` and `canonical_url` if primary

---

## X / Twitter

**Prompt:** `prompts/07-export-x.md`  
**Output:** `export/x/{slug}/thread.md` and `single.md`

**Prerequisite:** `canonical_url` set in manifest from long-form publish.

1. Choose thread or single from export files
2. Post manually on X (@iostom or @pokepitchshop per `x_account`)
3. Thread: post hook first, reply-chain remaining tweets
4. Copy tweet/thread URL
5. Update manifest: `published.x: {url}`

---

## After publish

Record metrics in `metrics/articles.yaml` (see POK-376).
