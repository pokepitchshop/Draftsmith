# Prompt: Generate article outline

Use this prompt in a Cursor session inside the `draftsmith` repo. `AGENTS.md` and `style/iostom-style-guide.md` load automatically.

## Instructions for the agent

Generate a detailed article outline in iostom's voice for the topic below. Follow these files exactly:

1. **Style:** `style/iostom-style-guide.md`
2. **Structure:** `templates/outline-template.md`
3. **Series (if applicable):** `series/{series-slug}/manifest.yaml` — read for arc, payoff line, and sibling parts

## Inputs (fill in before running)

| Field | Value |
|-------|-------|
| **Topic** | <!-- e.g. "Gorilla Mux routing in Go — Part 1" --> |
| **Slug** | <!-- kebab-case, e.g. go-gorilla-mux-part-1 --> |
| **Series** | <!-- series slug or "standalone" --> |
| **Part** | <!-- e.g. 1 of 3, or omit --> |
| **Channels** | <!-- e.g. medium, tommarler, x --> |
| **Read time target** | <!-- e.g. 4 min --> |

## Output

Save the completed outline to:

```
articles/drafts/{slug}/outline.md
```

If the draft folder does not exist, create it and add a manifest from `templates/manifest-template.yaml` (set `series` and `part` when applicable).

For **Part 2+**, read the prior part's `draft-v2.md` and use `templates/series-part-bridge-template.md` for opening/closing continuity.

## Outline rules

- Open with **problem-first context** — real-world "why" before "how".
- Include a **"What you'll learn"** payoff line (series payoff if applicable).
- Use **question-style section headings** (not declarative labels).
- For each section, specify: purpose, numbered steps, code/CLI to demo, and a `[Screenshot: ...]` placeholder after most steps.
- Close with recap bullets, next-part teaser (if series), and related links.
- Keep the outline scoped for a **2–5 minute read** unless the user asks for longer.
- Add a **Draft notes** section at the bottom for TL;DR, repo link, and accuracy checks (internal only).

## Acceptance check

Before saving, verify:

- [ ] Every section heading is phrased as a question
- [ ] At least one code/CLI block is planned per major step
- [ ] Screenshot placeholders follow steps that produce visible output
- [ ] Voice matches the style guide (first-person, encouraging, practical)

## Example topic (for testing)

**Topic:** What is Gorilla Mux? (Go HTTP routing — Part 1)
**Slug:** go-gorilla-mux-part-1
**Series:** go-gorilla-mux
**Part:** 1 of 3
