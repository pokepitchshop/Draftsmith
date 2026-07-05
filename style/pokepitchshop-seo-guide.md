# PokePitchShop SEO Style Guide

For `destination: pokepitchshop-seo` articles exported to pokepitchshop.com/blog.

## Voice

- Buyer-friendly and practical — help collectors make a purchase decision.
- Short paragraphs, scannable headings (questions or clear statements).
- Link to live inventory, not stale listing IDs.

## Required elements

1. **Keywords** — 1–3 primary keywords in frontmatter and naturally in the intro.
2. **Category link** — at least one link to `/catalog/pokemon`, `/catalog/sports`, `/catalog/mtg`, or `/catalog`.
3. **Catalog search link** — buyer-intent posts include `/catalog/{category}?q=...`.
4. **Cross-link** — link to at least one existing blog post at `/blog/{slug}`.
5. **Frontmatter** — must match pokepitchshop `lib/blog/posts.ts` schema.

## Frontmatter schema

```yaml
---
title: "..."
description: "..."              # 150–160 chars, includes primary keyword
publishedAt: "YYYY-MM-DD"
category: pokemon | sports | mtg | general
tags: [tag1, tag2]
keywords:
  - primary keyword
featuredImage: /images/Pokemon.png   # optional
---
```

## Publish steps (pokepitchshop repo)

1. Copy export to `pokepitchshop/content/blog/{slug}.mdx`
2. Add slug to `RELATED_POST_SLUGS` in `lib/blog/posts.ts`
3. Set `status: "published"` in `lib/blog/content-calendar.ts`
4. Push to Vercel
