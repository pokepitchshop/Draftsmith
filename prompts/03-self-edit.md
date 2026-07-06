# Prompt: Self-edit pass

Run on `draft.md` before exporting to any channel.

## Instructions for the agent

Edit the draft for clarity, accuracy, and voice match. Read:

1. **Draft:** `articles/drafts/{slug}/draft.md`
2. **Style:** `style/iostom-style-guide.md`
3. **Manifest:** `articles/drafts/{slug}/manifest.yaml`
4. **Series (if applicable):** `series/{series}/manifest.yaml` — verify continuity and sibling links

## Input

| Field | Value |
|-------|-------|
| **Slug** | <!-- e.g. go-gorilla-mux-part-1 --> |

## Output

Save to:

```
articles/drafts/{slug}/draft-v2.md
```

Update manifest: `status: review`

## Self-edit checklist

### Voice

- [ ] First-person, warm, encouraging — sounds like iostom
- [ ] Problem-first intro; "what you'll learn" payoff present
- [ ] Question-style section headings retained

### Grammar (recurring fixes)

- [ ] outweigh (not out weigh)
- [ ] their / there / they're
- [ ] than / then
- [ ] "known as" (not "know as")

### Technical

- [ ] Code blocks are runnable; commands match current tool versions
- [ ] No fabricated output — flag anything unverified
- [ ] Screenshot placeholders follow steps with visible results

### Structure

- [ ] Short paragraphs; break run-on sentences
- [ ] Recap + series teaser + comment invite + related links at end
- [ ] Remove any internal editor notes or outline artifacts

### Series (when `series` is set in manifest)

- [ ] Part 2+ opens with a clear callback to the prior article
- [ ] Series payoff or progress toward payoff is evident
- [ ] Related links include published sibling parts (omit unpublished)
- [ ] After saving, update matching part status in `series/{series}/manifest.yaml`

## Do not

- Change the technical approach unless fixing an error
- Remove screenshot placeholders
- Add channels or alter manifest channels
