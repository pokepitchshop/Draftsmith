#!/usr/bin/env node
/**
 * Link ingestion router — URL → clean markdown + LINK_TYPE (POK-419).
 *
 * Usage:
 *   node scripts/ingest-link.mjs <url> [--json] [--out path] [--engine jina|trafilatura|auto]
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { ingestLink } from "./lib/ingest-router.mjs";
import { formatSourceMaterial } from "./lib/format-source-material.mjs";

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
    console.error(
      "Usage: node scripts/ingest-link.mjs <url> [--json] [--out path] [--engine jina|trafilatura|auto]"
    );
    process.exit(1);
  }

  return { url: positional[0], json, out, engine };
}

const { url, json, out, engine } = parseArgs(process.argv.slice(2));

try {
  const payload = await ingestLink(url, { engine });
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
