# Prompt: Export for X / Twitter

Run **after** long-form publish. Requires `canonical_url` in manifest.

## Instructions for the agent

1. Read `articles/drafts/{slug}/draft-v2.md`
2. Read `articles/drafts/{slug}/manifest.yaml` — check `x_account` and `canonical_url`
3. Read `style/x-social-guide.md`
4. Follow `templates/export-x-thread.md` and `templates/export-x-single.md`

## Input

| Field | Value |
|-------|-------|
| **Slug** | <!-- e.g. go-gorilla-mux-part-1 --> |

## Output

```
export/x/{slug}/thread.md
export/x/{slug}/single.md
```

## Export rules

- Generate **both** thread and single-tweet options
- Use voice for `manifest.x_account` (iostom or pokepitchshop)
- Every tweet ≤280 characters — append char count; flag any over-limit
- Final thread tweet includes `canonical_url`
- 0–2 hashtags max

## If canonical_url is null

Stop and ask the user to publish long-form first and set `canonical_url`, then re-run.

## Publish

See `docs/publish-checklist.md` → X section.

## Acceptance

- [ ] Thread has hook + value tweets + link tweet
- [ ] Single tweet ≤280 chars with link
- [ ] Account voice matches `x_account`
