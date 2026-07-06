# Series part bridge templates

Use when drafting **Part 2+** to maintain continuity. Adapt in iostom's voice — warm, first-person, conversational.

Read `series/{series-slug}/manifest.yaml` and the prior part's `draft-v2.md` before filling these in.

---

## Part 1 opening (series intro)

No prior-article callback. Include the series payoff.

```
{{FRIENDLY_OPENER}}

{{PROBLEM_CONTEXT — why this series exists}}

When you finish this series you will {{PAYOFF_LINE from series manifest}}.
```

---

## Part 2+ opening (callback intro)

```
{{FRIENDLY_OPENER}}

In the last article we {{ONE_SENTENCE_RECAP_OF_PRIOR_PART}}. {{BRIDGE_TO_THIS_PART — what we add now}}.
```

**Example (Part 2):**

> In the last article we installed Gorilla Mux and built a router with a health check and a path variable route. Now we'll add subrouters and middleware so your API stays organized as it grows.

---

## Mid-series closing (next-part teaser)

```
{{RECAP_BULLETS_OR_PARAGRAPH}}

In Part {{N+1}} we'll {{CONCRETE_PREVIEW_OF_NEXT_TOPIC}}. See you in the next article.
```

---

## Final part closing (series wrap-up)

```
{{RECAP_OF_THIS_PART}}

That wraps up the {{SERIES_TITLE}} series — you now have {{PAYOFF_LINE}}.

Let me know what you think — leave a comment below. Looking forward to hearing from you :)

Please checkout the below links:

- {{PART_1_URL — "Part 1: {title}"}}
- {{PART_2_URL — if applicable}}
- {{EXTERNAL_CROSS_LINK from series manifest}}
```

---

## Related links block (any part)

List **published** sibling parts with live URLs. Omit parts not yet published.

```
Please checkout the below links:

- Part 1: {{TITLE}} — {{URL or "coming soon"}}
- Part 2: {{TITLE}} — {{URL or "coming soon"}}
- {{cross_links from series manifest}}
```
