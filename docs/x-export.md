# X / Twitter export guide

Generate promotion copy from a finished article — thread and single-tweet options for @iostom.

## When to run

After long-form publish (Medium or tommarler.com) and `canonical_url` is set in `manifest.yaml`.

## Files

| File | Purpose |
|------|---------|
| `style/x-social-guide.md` | Voice, format, char limits |
| `templates/export-x-thread.md` | Thread structure |
| `templates/export-x-single.md` | Single-tweet structure |
| `prompts/06-export-x.md` | Cursor prompt to generate exports |
| `scripts/validate-x-export.mjs` | Verify every tweet ≤280 chars |

## Workflow

1. Publish article to Medium or tommarler.com
2. Set `canonical_url` in `articles/drafts/{slug}/manifest.yaml`
3. Add `x` to manifest `channels` if not already present
4. Run `prompts/06-export-x.md` in Cursor
5. Validate: `node scripts/validate-x-export.mjs {slug}`
6. Choose thread or single; post manually on X as @iostom
7. Record URL in `manifest.yaml` → `published.x`

See also: [`docs/publish-checklist.md`](publish-checklist.md) → X section.

## Output layout

```text
export/x/{slug}/
├── thread.md    # numbered tweets with char counts
└── single.md    # one-liner option
```

## Sample

Validated sample for `go-gorilla-mux-part-1`:

```bash
node scripts/validate-x-export.mjs go-gorilla-mux-part-1
```

## Thread format

```markdown
# X thread — @iostom — {slug}
# Canonical: {url}

## Tweet 1/4 (hook)
{tweet text} (NNN chars)

## Tweet 4/4 (link)
{teaser + url + optional hashtag} (NNN chars)
```

## Single format

```markdown
# X single — @iostom
New: {payoff} → {url} #tag
(NNN chars)
```
