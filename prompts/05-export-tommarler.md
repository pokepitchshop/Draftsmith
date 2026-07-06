# Prompt: Export for tommarler.com

Run after self-edit. Only export if `tommarler` is in manifest channels.

## Instructions for the agent

1. Read `articles/drafts/{slug}/draft-v2.md`
2. Read `articles/drafts/{slug}/manifest.yaml`
3. Follow `templates/export-tommarler.md`

## Input

| Field | Value |
|-------|-------|
| **Slug** | <!-- e.g. go-gorilla-mux-part-1 --> |

## Output

```
export/tommarler/{slug}.md
```

## Export rules

- YAML frontmatter: `title`, `description`, `publishedAt`, `tags`
- Body: clean Markdown matching the draft
- `description`: 1–2 sentences for SEO meta
- `publishedAt`: today's date unless specified
- Convert screenshot placeholders to `<!-- image: ... -->` comments

## Publish

See `docs/publish-checklist.md` → tommarler.com section.

## Acceptance

- [ ] Valid YAML frontmatter
- [ ] Body matches draft voice and structure
- [ ] Ready to copy to `personalWebsite/content/blog/{slug}.md`
