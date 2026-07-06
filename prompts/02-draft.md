# Prompt: Generate article draft

Use after the outline is approved. `AGENTS.md` and `style/iostom-style-guide.md` load automatically.

## Instructions for the agent

Turn the outline into a full draft in iostom's voice. Follow:

1. **Outline:** `articles/drafts/{slug}/outline.md`
2. **Manifest:** `articles/drafts/{slug}/manifest.yaml`
3. **Style:** `style/iostom-style-guide.md`
4. **Structure:** `templates/article-template.md`

## Input

| Field | Value |
|-------|-------|
| **Slug** | <!-- e.g. go-gorilla-mux-part-1 --> |

## Output

Save to:

```
articles/drafts/{slug}/draft.md
```

## Draft rules

- Expand every outline section into prose — first-person, conversational.
- Use `##` headings matching the outline's question-style titles.
- Include real fenced code blocks and CLI commands from the outline.
- Keep `[Screenshot: ...]` placeholders where the outline specifies them.
- Include recap, next-part teaser (if series), engagement invite, and related links.
- Do **not** include the outline's "Draft notes" section in the draft.
- Target the read time from the outline (~2–5 min).

## Acceptance check

- [ ] Every outline section is expanded with runnable code/CLI
- [ ] Voice matches `style/iostom-style-guide.md`
- [ ] Screenshot placeholders remain for visual steps
- [ ] Sign-off ritual present (recap, teaser, comments invite, links)
