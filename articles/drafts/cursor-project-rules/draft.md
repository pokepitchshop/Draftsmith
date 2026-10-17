I kept pasting the same instructions into Cursor every time I opened my Draftsmith writing repo — voice rules, export paths, "don't run prompts in the terminal." The agent would drift after a few messages. Cursor project rules fixed that for me, and I wanted to share what actually stuck after I tried it on a real codebase.

When you finish reading this article you will have a working `AGENTS.md` plus one scoped `.cursor/rules` file that keeps Agent on-brand without retyping prompts.

## Why bother with project rules at all?

Models do not remember your last chat. Every new Agent session starts cold. If you care about voice, folder conventions, or "always validate before export," you need that context injected up front — not buried in a prompt you copy from Notes each time.

Cursor gives you a few ways to do that. I started with `AGENTS.md` in the repo root because it is plain markdown and zero ceremony. Once that worked, I added a project rule scoped to my draft folders so export workflows only load when I am actually editing articles.

## What is the simplest rule to add first?

Create `AGENTS.md` at the root of your project. Mine tells Agent who I am on Medium, how I structure tutorials, and where drafts live. Open the folder in Cursor and the file loads automatically — no frontmatter, no glob patterns.

Here is a minimal slice of what I use on my writing repo:

```markdown
# Project Instructions

You are assisting iostom (@osintiostom on Medium). I write hands-on technical tutorials.

## Repo conventions

- Drafts live in `articles/drafts/{slug}/`
- Run prompts in Cursor chat — not in the terminal
- Match voice in `style/iostom-style-guide.md`
```

[Screenshot: Cursor sidebar showing AGENTS.md in the project root with Agent chat open]

That alone stopped most of the "where should I save this?" back-and-forth.

## How do you add a scoped `.mdc` rule?

When `AGENTS.md` is not enough, add a file under `.cursor/rules/`. Project rules use the `.mdc` extension and a small YAML frontmatter block that controls when they attach.

I added one for link-to-article work — only when I am touching draft manifests or source material:

```markdown
---
description: Draftsmith link-to-article workflow — ingest, draft, validate
globs: articles/drafts/**,prompts/07-draft-from-link.md
alwaysApply: false
---

- After ingesting a URL, run `node scripts/validate-manifest.mjs {slug}` before export
- Source material is research — learn from it, do not copy paragraph-by-paragraph
- Credit `source_url` in the related links section
```

Save it as `.cursor/rules/link-to-article.mdc`. Next time I open a file under `articles/drafts/`, Cursor pulls this rule in without me `@`-mentioning it.

[Screenshot: Customize → Rules panel showing the new rule with "Apply to Specific Files" selected]

## Can you force a rule on every session?

Yes — set `alwaysApply: true` in frontmatter. I tried that for global voice rules and it worked, but the context got noisy when I was doing unrelated refactors. My compromise: keep persona and repo layout in `AGENTS.md` (always there), and use `globs` for workflow-specific rules that only matter in certain folders.

If you only want a rule when you ask for it, skip `globs` and `alwaysApply`, then `@`-mention the rule name in chat — handy for one-off migrations or experiments.

[Screenshot: Agent chat with @link-to-article rule manually invoked]

## What did not work for me?

Copying an entire style guide into a rule file. The docs are right that Agent already knows a lot of generic conventions — and a 400-line rule eats context. I point to `style/iostom-style-guide.md` instead of inlining it.

Also: a plain `.md` file sitting in `.cursor/rules/` does nothing. I learned that the hard way. Use `.mdc` with frontmatter, or stick with `AGENTS.md` for markdown-only instructions.

## Recap

You can tame repeat prompts by checking in persistent Agent instructions: start with root `AGENTS.md`, then add focused `.mdc` rules scoped with `globs` when a workflow needs extra guardrails. I did this on my Draftsmith repo and finally stopped re-explaining "iostom voice" every session.

Let me know what you think — leave a comment below. Looking forward to hearing from you :)

Please checkout the below links:

- Cursor Rules documentation: https://cursor.com/docs/rules
- Draftsmith (my writing-agent repo): https://github.com/pokepitchshop/Draftsmith
