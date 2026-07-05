# Medium export

Clean Markdown for paste into the Medium editor. No YAML frontmatter.

## Rules

- Strip internal notes and screenshot placeholder brackets → use Medium's image upload at those points (leave a one-line `<!-- image: description -->` comment if helpful).
- Keep fenced code blocks with language tags.
- Bold question-style subheadings as `##` headings.
- Preserve sign-off ritual and related links.
- Medium-compatible: standard Markdown only (no HTML unless necessary).

## Output path

```
export/medium/{slug}.md
```
