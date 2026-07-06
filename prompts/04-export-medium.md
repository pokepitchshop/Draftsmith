# Prompt: Export for Medium

Run after self-edit (`draft-v2.md`). Only export if `medium` is in manifest channels.

## Instructions for the agent

1. Read `articles/drafts/{slug}/draft-v2.md` (or `draft.md` if v2 doesn't exist)
2. Read `articles/drafts/{slug}/manifest.yaml`
3. Follow `templates/export-medium.md`

## Input

| Field | Value |
|-------|-------|
| **Slug** | <!-- e.g. go-gorilla-mux-part-1 --> |

## Output

```
export/medium/{slug}.md
```

## Export rules

- Medium-ready Markdown — no YAML frontmatter.
- Keep code blocks, headings, and links.
- Convert `[Screenshot: ...]` to `<!-- image: ... -->` comments.
- Remove series-internal "Draft notes" if any remain.
- Update manifest: `status: exported`

## Acceptance

- [ ] Pastes cleanly into Medium editor
- [ ] Code blocks have language tags
- [ ] No internal editor artifacts
