# Prompt: Export for pokepitchshop.com

Run after self-edit. Only export if `pokepitchshop` is in manifest channels and `destination: pokepitchshop-seo`.

## Instructions for the agent

1. Read `articles/drafts/{slug}/draft-v2.md`
2. Read `articles/drafts/{slug}/manifest.yaml`
3. Read `style/pokepitchshop-seo-guide.md`
4. Follow `templates/export-pokepitchshop.mdx`

## Input

| Field | Value |
|-------|-------|
| **Slug** | <!-- e.g. how-much-is-charizard-worth --> |

## Output

```
export/pokepitchshop/{slug}.mdx
```

## Export rules

- Full MDX file with YAML frontmatter matching pokepitchshop schema
- Include ≥1 `/catalog/` link and ≥1 `/blog/` cross-link
- Buyer-intent posts include a catalog search URL (`?q=`)
- `keywords` array with 1–3 target keywords
- `category`: pokemon | sports | mtg | general

## Publish

See `docs/publish-checklist.md` → pokepitchshop.com section.

## Acceptance

- [ ] Frontmatter validates against pokepitchshop `lib/blog/posts.ts`
- [ ] Required catalog and cross-links present
- [ ] Ready to copy to `pokepitchshop/content/blog/{slug}.mdx`
