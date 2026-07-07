#!/usr/bin/env node
/**
 * Scaffold a link-to-article draft folder (POK-421).
 * Lower-level helper — prefer `node scripts/draftsmith.mjs new <url>` (POK-426).
 *
 * Usage:
 *   node scripts/prepare-link-draft.mjs <url> --slug <slug> [options]
 */

import { scaffoldLinkDraft } from "./lib/link-draft.mjs";

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
    console.error(`Tip:    node scripts/draftsmith.mjs new <url>  # auto slug (POK-426)`);
    process.exit(1);
  }

  return result;
}

const args = parseArgs(process.argv.slice(2));

try {
  console.error(`Ingesting: ${args.url}`);
  const result = await scaffoldLinkDraft(args);

  console.error(`\nCreated articles/drafts/${result.slug}/`);
  console.error(`  source-material.md  (${result.linkType}, ${result.sourceLength} chars)`);
  console.error(`  manifest.yaml`);
  console.error(`  handoff.md`);
  console.error(`\nNext: ${result.cursorPrompts[0].message}`);
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exit(1);
}
