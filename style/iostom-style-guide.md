# iostom Style Guide

Reusable reference so every Draftsmith outline and draft matches [iostom's](https://medium.com/@osintiostom) Medium voice. Codified from full article text in [POK-371](https://linear.app/pokepitchshop/issue/POK-371/codify-iostom-style-guide-from-existing-medium-articles).

**Canonical persona:** [Understand Me — iostom Persona Prompt](https://linear.app/pokepitchshop/document/understand-me-iostom-persona-prompt-for-claude-codex-copilot-49d2feb1fa50)

**Source articles:** [`references/medium-articles.md`](../references/medium-articles.md)

**Used by:** `AGENTS.md`, `prompts/01-outline.md`, `prompts/02-draft.md`, `prompts/03-self-edit.md`

---

## Author profile

iOS Developer, Go, Java, C#, Blockchain enthusiast, Data junkie. Writes hands-on technical tutorials — learning in public, building something real on screen.

---

## Voice and tone

| Do | Don't |
|----|-------|
| Warm, conversational, first-person | Third-person textbook tone |
| Talk straight to the reader: "I will show you how to…" | Passive voice or abstract theory without a demo |
| Friendly openers when natural: "Happy Monday everyone, thought I would start the week off with an article about what I have been learning" | Stiff corporate intro |
| Light `:)` sparingly | Emoji overload or forced humor |
| Honest, self-deprecating: "This article is a little longer then expected", "If you see something different, like I did :)" | Over-polished or hiding mistakes |
| Frame real-world **why** before **how** | Jump straight to install commands with no context |

**Problem-first framing (from Pyenv/Poetry and Cloud Native series):**

> As a company grows, so does the codebase… business needs outweigh quality and technical debt increases.

> Infrastructure management is a very manual process and error prone. IaC provides automation, reusability and…

Lead with the reader's pain or payoff — not philosophy for its own sake.

---

## Article structure

### Length and scope

- **2–5 minute read** per post (occasionally longer; acknowledge it honestly).
- One clear outcome per article — something the reader can run and see on their screen by the end.

### Opening (standalone)

1. Optional friendly opener (day-of-week, what you've been learning).
2. **Problem-first context** — why this topic matters in a real project or business.
3. **What you'll learn** — one payoff sentence.

**Series Part 1 opening** — add series payoff:

> When you are finished reading this series you will have a development environment configured and an application boiler template setup that properly handles dependencies…

**Series Part 2+ opening** — callback to prior part:

> In the last article I went over basic Terraform definitions. In this article I am going to explain how to setup AWS and Cloud9.

See also: `templates/series-part-bridge-template.md`

### Section headings

Almost always **questions**, not labels:

| Good | Avoid |
|------|-------|
| What is Gorilla Mux? | Gorilla Mux overview |
| How do you create a NewRouter? | Creating a router |
| Can a path have a variable? | Path variables |
| Setting up Pyenv | (declarative) |

Use `##` headings in drafts; Medium export keeps them bold.

### Step-by-step body

Each major section follows this rhythm:

1. One or two sentences of context.
2. Numbered or sequential steps.
3. **Fenced code block** or CLI command the reader can copy.
4. Brief explanation of what happened.
5. **`[Screenshot: …]`** placeholder after steps that produce visible output (terminal, browser, IDE).

**From Gorilla Mux and Pyenv articles:** show the command, then show the result. End sections with something the reader can verify (`curl`, `pyenv version`, `poetry env info`).

### Code vs screenshots

| Content | Format |
|---------|--------|
| Source code, config, shell commands | Fenced code blocks with language tag |
| Terminal output, IDE settings, browser UI | Screenshot placeholder |
| Long prose or config pasted as images | **Don't** — use a code block instead |

### Series structure

- Number parts clearly in title: `(Part 1)`, `Part: 2`, `PART:1` — prefer consistent `(Part N)` in new work.
- Cross-link to prior parts with live URLs when published.
- Tease the next part at the end: "See you in the next article."
- Track arc in `series/{slug}/manifest.yaml` — see `docs/series-planning.md`.

**Reference series patterns:**

| Series | Pattern |
|--------|---------|
| Pyenv/Poetry/EditorConfig/Safety | Business framing → tool install → CLI walkthrough → screenshot per step → "next article" teaser |
| Gorilla Mux | Small Go API built incrementally; `curl` to prove each route |
| Python OSINT scraping | Personal motivation (marketing question) → library comparison → inspect HTML with devtools → scrape demo |
| Cloud Native Terraform | IaC motivation → definitions → AWS setup → budget/Cloud9 → multi-part AWS infra |

---

## Sign-off ritual

Always close in this order:

1. **Recap** — what the reader accomplished (bullets or short paragraph).
2. **Next part teaser** (series only) — concrete preview of Part N+1.
3. **Comment invite** — "Let me know what you think", "leave a comment below. Looking forward to hearing from you :)"
4. **Related links** — lead with: "Please checkout the below links:"

**Example (Pyenv Part 1):**

> This article is a little longer then expected and I am going to show you in the next Article how to setup poetry. Thanks again for reading :), if you have an questions please leave a comment below. Looking forward to hearing from you :).

List sibling parts, GitHub repos, official docs, and prior related posts.

---

## Titles

- **Outcome-driven** when possible: "Go: Gorilla Mux how to get URL params", "Development Setup: Pyenv, Poetry, EditorConfig, Safety: Part 1"
- Include **Part N** for series entries.
- Question-style titles work for sections; titles can be declarative if they state the payoff.

**Optional enhancements (internal outline / draft notes, not always in published post):**

- TL;DR candidate (1–2 sentences)
- "What you'll build" bullet list
- GitHub repo link for demo code

---

## Improvement guidelines

Raise quality without losing iostom's conversational voice:

1. **Lead with pain/payoff** — reader knows why they're here in the first paragraph.
2. **End with a working result** — curl output, running server, `pyenv version`, parsed HTML — something verifiable.
3. **Short paragraphs** — break run-on sentences (common in early drafts).
4. **Real code blocks** — never screenshot code that should be copy-pasteable.
5. **Link a demo repo** when the article builds something over multiple steps.
6. **Flag unverified output** — don't fabricate command results.

### Before / after examples

**Opening — too thin:**

> Gorilla Mux is a router. This article covers installation.

**Opening — on brand:**

> I have been working on creating a web application with Go. I am currently making rest calls to multiple APIs… Gorilla Mux helps you register routes and read URL parameters. I will show you how to get started.

**Heading — wrong:**

> Installation

**Heading — on brand:**

> How do you install Pyenv on Mac?

**Sign-off — incomplete:**

> That's it for today.

**Sign-off — on brand:**

> Currently you should have pyenv setup with multiple different versions installed… I am going to show you in the next Article how to setup poetry. Thanks again for reading :), if you have an questions please leave a comment below.

---

## Grammar checklist

Proofread every self-edit pass. Recurring fixes:

| Correct | Common mistake |
|---------|------------------|
| outweigh | out weigh |
| their / there / they're | mixed up |
| than (comparison) / then (sequence) | swapped |
| known as | know as |
| codebase | code base (sometimes OK; prefer one word) |

**Note:** iostom's published voice occasionally uses informal grammar ("then" for "than", "an questions") — preserve warmth in new drafts but **fix clear errors** in the self-edit pass unless quoting original Medium text intentionally.

---

## Topic areas

iOS/Swift, Go, Java, C#, Cloud Native (Terraform, Jenkins, CI/CD, Docker, AWS), Python/OSINT, blockchain, data.

When writing outside these areas, keep the same structure and voice — problem-first, question headings, step-by-step demos.

---

## Draftsmith workflow

| Stage | Style guide usage |
|-------|-------------------|
| Outline | Match voice, question headings, screenshot placeholders per `templates/outline-template.md` |
| Draft | Expand outline in first-person; apply sign-off ritual |
| Self-edit | Run grammar checklist; verify code is runnable; confirm series callbacks |
| Export | Preserve headings, code blocks, sign-off; strip internal "Draft notes" |

See [`docs/style-guide.md`](../docs/style-guide.md) for how this guide fits the full pipeline.
