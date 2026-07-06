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

## X / Twitter

**Guide:** [`docs/x-export.md`](x-export.md)  
**Prompt:** `prompts/06-export-x.md`  
**Output:** `export/x/{slug}/thread.md` and `single.md`

**Prerequisite:** `canonical_url` set in manifest from long-form publish.

1. Choose thread or single from export files
2. Validate: `node scripts/validate-x-export.mjs {slug}`
3. Post manually on X as @iostom
4. Thread: post hook first, reply-chain remaining tweets
5. Copy tweet/thread URL
6. Update manifest: `published.x: {url}`

---

## After publish

Record metrics in `metrics/articles.yaml` (see POK-376).
