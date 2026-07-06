#!/usr/bin/env node
/**
 * Link ingestion router — URL → clean markdown + LINK_TYPE (POK-419).
 *
 * Usage:
 *   node scripts/ingest-link.mjs <url> [--json] [--out path] [--engine jina|trafilatura|auto]
 *
 * Examples:
 *   node scripts/ingest-link.mjs https://github.com/gorilla/mux
 *   node scripts/ingest-link.mjs https://example.com/docs --json
 *   node scripts/ingest-link.mjs https://www.youtube.com/watch?v=dQw4w9WgXcQ --out sources/demo.md
 *
 * Optional env:
 *   GITHUB_TOKEN  — higher GitHub API rate limits
 *   JINA_API_KEY  — Jina Reader auth for article/docs/blog
 *
 * Python fallback (article + youtube):
 *   pip install -r scripts/requirements-ingest.txt
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { detectLinkType } from "./lib/detect-link-type.mjs";
import { ingestArticleLike } from "./lib/ingest-article.mjs";
import { ingestGitHub } from "./lib/ingest-github.mjs";
import { ingestYouTube } from "./lib/ingest-youtube.mjs";

function parseArgs(argv) {
  const positional = [];
  let json = false;
  let out = null;
  let engine = "auto";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") json = true;
    else if (arg === "--out") out = argv[++i];
    else if (arg === "--engine") engine = argv[++i];
    else if (!arg.startsWith("-")) positional.push(arg);
  }

  if (positional.length === 0) {
    console.error(`Usage: node scripts/ingest-link.mjs <url> [--json] [--out path] [--engine jina|trafilatura|auto]`);
    process.exit(1);
  }

  return { url: positional[0], json, out, engine };
}

function formatSourceMaterial({ url, linkType, title, markdown, engine }) {
  const ingestedAt = new Date().toISOString();
  return `---
source_url: ${url}
link_type: ${linkType}
title: "${title.replace(/"/g, '\\"')}"
ingested_at: ${ingestedAt}
engine: ${engine}
---

${markdown}
`;
}

async function route(url, options) {
  const linkType = detectLinkType(url);

  let result;
  switch (linkType) {
    case "youtube":
      result = ingestYouTube(url);
      break;
    case "github":
      result = await ingestGitHub(url);
      break;
    case "article":
    case "docs":
    case "blog":
      result = await ingestArticleLike(url, linkType, { engine: options.engine });
      break;
    default:
      throw new Error(`Unsupported link type: ${linkType}`);
  }

  return {
    url,
    link_type: linkType,
    title: result.title,
    markdown: result.markdown,
    engine: result.engine,
  };
}

const { url, json, out, engine } = parseArgs(process.argv.slice(2));

try {
  const payload = await route(url, { engine });
  const sourceMaterial = formatSourceMaterial({
    url: payload.url,
    linkType: payload.link_type,
    title: payload.title,
    markdown: payload.markdown,
    engine: payload.engine,
  });

  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, sourceMaterial, "utf8");
    console.error(`Wrote ${out} (${payload.link_type}, ${payload.markdown.length} chars)`);
  }

  if (json) {
    console.log(JSON.stringify({ ...payload, source_material: sourceMaterial }, null, 2));
  } else if (!out) {
    console.log(`LINK_TYPE: ${payload.link_type}`);
    console.log(`TITLE: ${payload.title}`);
    console.log(`ENGINE: ${payload.engine}`);
    console.log(`CHARS: ${payload.markdown.length}`);
    console.log("\n--- SOURCE MATERIAL ---\n");
    console.log(sourceMaterial);
  }
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exit(1);
}
