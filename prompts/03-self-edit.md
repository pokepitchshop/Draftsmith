# Prompt: Self-edit pass

Run on `draft.md` before exporting to any channel.

## Instructions for the agent

Edit the draft for clarity, accuracy, and voice match. Read:

1. **Draft:** `articles/drafts/{slug}/draft.md`
2. **Style:** `style/iostom-style-guide.md`
3. **Manifest:** `articles/drafts/{slug}/manifest.yaml`

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

## Do not

- Change the technical approach unless fixing an error
- Remove screenshot placeholders
- Add channels or alter manifest channels
