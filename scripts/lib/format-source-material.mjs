/**
 * Format ingested content as source-material markdown with frontmatter.
 */

export function formatSourceMaterial({ url, linkType, title, markdown, engine }) {
  const ingestedAt = new Date().toISOString();
  const escapedTitle = title.replace(/"/g, '\\"');

  return `---
source_url: ${url}
link_type: ${linkType}
title: "${escapedTitle}"
ingested_at: ${ingestedAt}
engine: ${engine}
---

${markdown}
`;
}
