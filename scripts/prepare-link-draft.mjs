#!/usr/bin/env node
/**
 * Scaffold a link-to-article draft folder (POK-421).
 *
 * Usage:
 *   node scripts/prepare-link-draft.mjs <url> --slug <slug> [options]
 *
 * Options:
 *   --slug <slug>           Required. kebab-case article slug
 *   --title <title>         Article title (default: from ingestion)
 *   --channels <list>       Comma-separated: medium,tommarler,x (default: medium)
 *   --angle <text>          Optional one-liner for drafting angle
 *   --series <slug>         Series slug or omit for standalone
 *   --part <n>              Part number when part of a series
 *   --engine <engine>       jina | trafilatura | auto (default: auto)
 *
 * Example:
 *   node scripts/prepare-link-draft.mjs https://github.com/gorilla/mux \
 *     --slug go-gorilla-mux-url-params \
 *     --angle "Show path variables with mux.Vars in a tiny Go API"
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ingestLink } from "./lib/ingest-router.mjs";
import { formatSourceMaterial } from "./lib/format-source-material.mjs";
import { buildManifestYaml } from "./lib/manifest-schema.mjs";

function parseArgs(argv) {
  const result = {
    url: null,
    slug: null,
    title: null,
    channels: ["medium"],
    angle: null,
    series: null,
    part: null,
    engine: "auto",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--slug") result.slug = argv[++i];
    else if (arg === "--title") result.title = argv[++i];
    else if (arg === "--channels") result.channels = argv[++i].split(",").map((c) => c.trim());
    else if (arg === "--angle") result.angle = argv[++i];
    else if (arg === "--series") result.series = argv[++i];
    else if (arg === "--part") result.part = Number(argv[++i]);
    else if (arg === "--engine") result.engine = argv[++i];
    else if (!arg.startsWith("-") && !result.url) result.url = arg;
  }

  if (!result.url || !result.slug) {
    console.error(`Usage: node scripts/prepare-link-draft.mjs <url> --slug <slug> [options]`);
    process.exit(1);
  }

  return result;
}

const args = parseArgs(process.argv.slice(2));

try {
  console.error(`Ingesting: ${args.url}`);
  const payload = await ingestLink(args.url, { engine: args.engine });
  const title = args.title || payload.title;
  const draftDir = join(process.cwd(), "articles", "drafts", args.slug);

  mkdirSync(draftDir, { recursive: true });

  const sourceMaterial = formatSourceMaterial({
    url: payload.url,
    linkType: payload.link_type,
    title: payload.title,
    markdown: payload.markdown,
    engine: payload.engine,
  });

  const manifest = buildManifestYaml({
    slug: args.slug,
    title,
    channels: args.channels,
    sourceUrl: payload.url,
    linkType: payload.link_type,
    angle: args.angle,
    series: args.series,
    part: args.part,
  });

  writeFileSync(join(draftDir, "source-material.md"), sourceMaterial, "utf8");
  writeFileSync(join(draftDir, "manifest.yaml"), manifest, "utf8");

  console.error(`\nCreated articles/drafts/${args.slug}/`);
  console.error(`  source-material.md  (${payload.link_type}, ${payload.markdown.length} chars)`);
  console.error(`  manifest.yaml`);
  console.error(`\nNext: run prompts/07-draft-from-link.md in Cursor for slug ${args.slug}`);
  console.error(`Then: prompts/03-self-edit.md → export prompts for manifest channels`);
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exit(1);
}
