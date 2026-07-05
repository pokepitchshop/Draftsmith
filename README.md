# Draftsmith

AI writing agent for technical articles in [iostom's](https://medium.com/@osintiostom) hands-on tutorial style. Exports to Medium, tommarler.com, pokepitchshop.com, and X.

Linear project: [Draftsmith](https://linear.app/pokepitchshop/project/draftsmith-7075cfe872a1)

## Workflow

1. **Outline** — `prompts/01-outline.md` → `articles/drafts/{slug}/outline.md`
2. **Draft** — `prompts/02-draft.md` (POK-373)
3. **Self-edit** — `prompts/03-self-edit.md` (POK-373)
4. **Export** — channel-specific prompts in `prompts/04-*` (POK-373)

## Generate an outline (POK-372)

1. Open this repo in Cursor (`AGENTS.md` loads automatically).
2. Open `prompts/01-outline.md` and fill in the topic table.
3. Ask the agent to generate the outline per the prompt instructions.
4. Output lands in `articles/drafts/{slug}/outline.md`.

## Key files

| Path | Purpose |
|------|---------|
| `AGENTS.md` | Persona and voice for Cursor |
| `style/iostom-style-guide.md` | Writing rules for outlines and drafts |
| `templates/outline-template.md` | Outline structure |
| `templates/article-template.md` | Full draft structure (POK-373) |
| `prompts/01-outline.md` | Outline generator prompt |
