# Style guide workflow

How Draftsmith uses the codified iostom voice ([POK-371](https://linear.app/pokepitchshop/issue/POK-371/codify-iostom-style-guide-from-existing-medium-articles)).

## Canonical files

| File | Role |
|------|------|
| [`style/iostom-style-guide.md`](../style/iostom-style-guide.md) | Full voice, structure, grammar, and examples |
| [`references/medium-articles.md`](../references/medium-articles.md) | Source article catalog with style patterns |
| [`AGENTS.md`](../AGENTS.md) | Cursor persona (summary of style guide) |
| [Understand Me persona prompt](https://linear.app/pokepitchshop/document/understand-me-iostom-persona-prompt-for-claude-codex-copilot-49d2feb1fa50) | Original Linear document |

## When each prompt reads the style guide

| Prompt | How style guide applies |
|--------|-------------------------|
| `00-series-plan.md` | Series arc, payoff lines, part scope (~2–5 min each) |
| `01-outline.md` | Question headings, screenshot placeholders, opening/closing structure |
| `02-draft.md` | First-person voice, code blocks, sign-off ritual |
| `03-self-edit.md` | Grammar checklist, run-on fixes, series continuity |
| `04–06` export | Preserve headings and code; strip internal draft notes only |

## Self-edit quick reference

From `style/iostom-style-guide.md` — verify before export:

- [ ] Problem-first intro + "what you'll learn"
- [ ] Section headings phrased as questions
- [ ] Fenced code for commands; screenshots for visual output only
- [ ] Recap → series teaser → comment invite → "Please checkout the below links"
- [ ] Grammar: outweigh, their/there/they're, than/then, known as
- [ ] Ending proves something works on the reader's machine

## Source series (for voice calibration)

Re-read these when a draft feels off-voice:

1. **Pyenv/Poetry** — business framing + CLI screenshots + honest length aside
2. **Gorilla Mux** — incremental Go API with verifiable steps
3. **Python OSINT scraping** — personal motivation + library walkthrough

URLs: [`references/medium-articles.md`](../references/medium-articles.md)

## Metrics feedback loop (POK-376)

After publish, record engagement in `metrics/articles.yaml`. Use learnings to refine sections of the style guide — especially titles, openers, and TL;DR patterns that correlate with reads/claps.
