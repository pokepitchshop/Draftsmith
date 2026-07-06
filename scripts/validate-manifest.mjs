#!/usr/bin/env node
/**
 * Validate article manifest.yaml (POK-420 / POK-421).
 * Usage: node scripts/validate-manifest.mjs [slug]
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const VALID_CHANNELS = new Set(["medium", "tommarler", "x"]);
const VALID_LINK_TYPES = new Set(["article", "docs", "blog", "github", "youtube", "null"]);
const VALID_STATUSES = new Set(["draft", "review", "exported", "published"]);

const slug = process.argv[2];

if (!slug) {
  console.error("Usage: node scripts/validate-manifest.mjs <slug>");
  process.exit(1);
}

function stripInlineComment(value) {
  const idx = value.search(/\s+#/);
  return (idx === -1 ? value : value.slice(0, idx)).trim();
}

function parseSimpleYaml(text) {
  const result = {};
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) {
      i++;
      continue;
    }

    const keyMatch = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!keyMatch) {
      i++;
      continue;
    }

    const key = keyMatch[1];
    const rest = stripInlineComment(keyMatch[2]);

    if (rest === "") {
      if (lines[i + 1]?.trim().startsWith("- ")) {
        const list = [];
        i++;
        while (i < lines.length && lines[i].trim().startsWith("- ")) {
          list.push(stripInlineComment(lines[i].trim().slice(2)));
          i++;
        }
        result[key] = list;
        continue;
      }
    }

    result[key] = rest.replace(/^"|"$/g, "");
    i++;
  }

  return result;
}

const manifestPath = join(process.cwd(), "articles", "drafts", slug, "manifest.yaml");
let failed = false;

console.log(`Validating manifest: ${slug}\n`);

if (!existsSync(manifestPath)) {
  console.error(`Missing: ${manifestPath}`);
  process.exit(1);
}

const manifest = parseSimpleYaml(readFileSync(manifestPath, "utf8"));

if (manifest.slug !== slug) {
  console.error(`FAIL slug: manifest has "${manifest.slug}", expected "${slug}"`);
  failed = true;
} else {
  console.log(`OK   slug: ${manifest.slug}`);
}

if (!manifest.title) {
  console.error("FAIL title: required");
  failed = true;
} else {
  console.log(`OK   title: ${manifest.title}`);
}

const channels = manifest.channels ?? [];
if (!Array.isArray(channels) || channels.length === 0) {
  console.error("FAIL channels: at least one channel required");
  failed = true;
} else {
  for (const channel of channels) {
    if (!VALID_CHANNELS.has(channel)) {
      console.error(`FAIL channels: invalid "${channel}"`);
      failed = true;
    }
  }
  if (!failed) console.log(`OK   channels: ${channels.join(", ")}`);
}

if (manifest.link_type && manifest.link_type !== "null" && !VALID_LINK_TYPES.has(manifest.link_type)) {
  console.error(`FAIL link_type: invalid "${manifest.link_type}"`);
  failed = true;
} else if (manifest.link_type && manifest.link_type !== "null") {
  console.log(`OK   link_type: ${manifest.link_type}`);
}

if (manifest.source_url && manifest.source_url !== "null") {
  try {
    new URL(manifest.source_url);
    console.log(`OK   source_url: ${manifest.source_url}`);
  } catch {
    console.error(`FAIL source_url: invalid URL "${manifest.source_url}"`);
    failed = true;
  }
}

if (manifest.status && !VALID_STATUSES.has(manifest.status)) {
  console.error(`FAIL status: invalid "${manifest.status}"`);
  failed = true;
} else {
  console.log(`OK   status: ${manifest.status}`);
}

const sourcePath = join(process.cwd(), "articles", "drafts", slug, "source-material.md");
if (manifest.source_url && manifest.source_url !== "null") {
  if (!existsSync(sourcePath)) {
    console.warn(`WARN source-material.md missing (expected for link-to-article drafts)`);
  } else {
    console.log(`OK   source-material.md exists`);
  }
}

console.log("");
if (failed) {
  console.error("Validation failed.");
  process.exit(1);
}

console.log("Manifest validation passed.");
