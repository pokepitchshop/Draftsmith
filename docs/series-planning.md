# Series planning guide

Plan and maintain numbered multi-part articles — a core iostom pattern.

## When to use a series

Use a series when the topic needs more than one **2–5 minute** post:

- Foundations in Part 1, advanced patterns in later parts
- Each part builds on code from the previous article
- Readers follow along across weeks with "See you in the next article"

Examples to model: Cloud Native Terraform (Parts 1–3), Python OSINT web scraping.

## Files

| Path | Purpose |
|------|---------|
| `prompts/00-series-plan.md` | Cursor prompt to break a topic into parts |
| `templates/series-manifest-template.yaml` | Series manifest schema |
| `templates/series-part-bridge-template.md` | Intro/recap phrasing for Part 2+ |
| `series/{series-slug}/manifest.yaml` | Series arc, part list, statuses |
| `scripts/validate-series.mjs` | Check manifests and slug consistency |

## Workflow

```text
00-series-plan  →  series/{slug}/manifest.yaml + Part 1 scaffold
       ↓
01-outline      →  articles/drafts/{slug}-part-1/outline.md
       ↓
02-draft … 03-self-edit … export … publish
       ↓
Update series manifest part status → plan Part 2
```

### 1. Plan the series

Run `prompts/00-series-plan.md` in Cursor with topic and series slug.

Output: `series/{series-slug}/manifest.yaml` plus Part 1 article folder.

### 2. Write each part

Use the normal outline → draft → self-edit flow. In prompts 01–03, the agent reads the series manifest for context.

For **Part 2+**, use `templates/series-part-bridge-template.md`:

- Opening: brief callback to prior part ("In the last article we…")
- Closing: teaser for next part with concrete preview

### 3. Keep statuses in sync

| Location | Field | Values |
|----------|-------|--------|
| Series manifest | `parts[].status` | `planned` → `draft` → `review` → `exported` → `published` |
| Article manifest | `status` | same progression |
| Article manifest | `series`, `part` | link back to series |

After publishing a part:

1. Set `published.{channel}` URLs in article manifest
2. Set `canonical_url` on the article manifest
3. Update the matching part in `series/{slug}/manifest.yaml` to `published`
4. Add sibling cross-links in the next part's outline (prior part URL)

### 4. Validate

```bash
node scripts/validate-series.mjs go-gorilla-mux
```

Checks:

- Series manifest parses and `total_parts` matches `parts[]` length
- Each part slug follows `{series-slug}-part-{n}`
- Article manifests exist for non-`planned` parts
- `series` and `part` fields match on article manifests
- Warns on status mismatches between series and article manifests

## Sample series

See `series/go-gorilla-mux/manifest.yaml` — three-part Gorilla Mux routing series aligned with `articles/drafts/go-gorilla-mux-part-1/`.

## Related

- `style/iostom-style-guide.md` — series voice and structure
- `prompts/01-outline.md` — per-part outline (includes Series / Part inputs)
- `docs/publish-checklist.md` — publish steps per channel
