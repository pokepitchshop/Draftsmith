# Prompt: Plan a multi-part series

Run **before** outlining individual parts. Use when a topic is too big for one post.

## Instructions for the agent

1. Read `style/iostom-style-guide.md` — series structure and voice
2. Follow `templates/series-manifest-template.yaml`
3. Model after iostom patterns: numbered parts, question headings, cross-links between posts

## Input

| Field | Value |
|-------|-------|
| **Topic** | <!-- e.g. "Go HTTP routing with Gorilla Mux" --> |
| **Series slug** | <!-- kebab-case, e.g. go-gorilla-mux --> |
| **Suggested parts** | <!-- e.g. 3, or "let agent decide" --> |
| **Reference series** | <!-- optional: Terraform Parts 1–3, Python OSINT scraping --> |

## Output

Create the series manifest and scaffold draft folders for Part 1:

```
series/{series-slug}/manifest.yaml
articles/drafts/{series-slug}-part-1/manifest.yaml
articles/drafts/{series-slug}-part-1/outline.md   # optional stub only if user asks
```

Do **not** write full outlines for every part unless the user asks — focus on the series arc and part breakdown.

## Planning rules

### Break the topic into parts

- Each part = one **2–5 minute read** with a clear single outcome
- Part 1: foundations and first working example
- Middle parts: build on prior code; reference "In the last article…"
- Final part: capstone or production-ready pattern + series recap

### Series manifest fields

- `title`, `slug`, `total_parts`, `status` (`planning` → `in_progress` → `complete`)
- `payoff_line` — one sentence for "When you finish this series you will have…"
- `parts[]` — each with `part`, `slug`, `title`, `status` (`planned` | `draft` | `review` | `exported` | `published`)
- `cross_links[]` — external references (GitHub, docs, related Medium posts)
- `notes` — arc summary, code repo to reuse across parts, open questions

### Slug convention

```
{series-slug}-part-{n}
```

Example: `go-gorilla-mux-part-1`, `go-gorilla-mux-part-2`

### Per-part article manifest

When creating Part 1 folder, copy `templates/manifest-template.yaml` and set:

- `series: {series-slug}`
- `part: 1`
- `title` matching the series manifest part title

## Continuity checklist (for later parts)

When outlining/drafting Part 2+, read:

1. `series/{series-slug}/manifest.yaml`
2. Prior part's `draft-v2.md` (or latest draft)
3. `templates/series-part-bridge-template.md` for intro/recap phrasing

## After planning

1. Run `node scripts/validate-series.mjs {series-slug}`
2. Outline Part 1 with `prompts/01-outline.md`
3. After each part reaches `published`, update series manifest part status and `canonical_url`

## Acceptance

- [ ] Each part has a distinct, achievable scope (one sitting read)
- [ ] Part titles read as a logical progression
- [ ] `payoff_line` describes the full series outcome
- [ ] Part 1 draft folder and manifest exist
- [ ] `node scripts/validate-series.mjs {series-slug}` passes
