#!/usr/bin/env node
/**
 * Validate series manifest and linked article manifests.
 * Usage: node scripts/validate-series.mjs [series-slug]
 * Example: node scripts/validate-series.mjs go-gorilla-mux
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const seriesSlug = process.argv[2];

if (!seriesSlug) {
  console.error("Usage: node scripts/validate-series.mjs <series-slug>");
  process.exit(1);
}

const VALID_PART_STATUSES = new Set([
  "planned",
  "draft",
  "review",
  "exported",
  "published",
]);

const VALID_SERIES_STATUSES = new Set(["planning", "in_progress", "complete"]);

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
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
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

    if (rest === "|") {
      const block = [];
      i++;
      while (i < lines.length && (lines[i].startsWith("  ") || lines[i].trim() === "")) {
        block.push(lines[i].replace(/^  /, ""));
        i++;
      }
      result[key] = block.join("\n").trimEnd();
      continue;
    }

    if (rest === "") {
      if (lines[i + 1]?.trim().startsWith("- ")) {
        const list = [];
        i++;
        while (i < lines.length) {
          const row = lines[i];
          if (!row.trim().startsWith("- ")) break;

          const obj = {};
          const firstKey = row.match(/^\s*-\s*([a-z_]+):\s*(.*)$/i);
          if (firstKey) {
            obj[firstKey[1]] = stripInlineComment(firstKey[2]).replace(/^"|"$/g, "");
          }
          i++;

          while (i < lines.length && lines[i].match(/^\s{4,}[a-z_]+:/i)) {
            const nested = lines[i].match(/^\s+([a-z_]+):\s*(.*)$/i);
            if (nested) {
              obj[nested[1]] = stripInlineComment(nested[2]).replace(/^"|"$/g, "");
            }
            i++;
          }

          list.push(obj);
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

function loadYaml(path) {
  if (!existsSync(path)) {
    console.error(`Missing: ${path}`);
    return null;
  }
  return parseSimpleYaml(readFileSync(path, "utf8"));
}

function expectedPartSlug(slug, partNum) {
  return `${slug}-part-${partNum}`;
}

let failed = false;
const seriesPath = join(process.cwd(), "series", seriesSlug, "manifest.yaml");

console.log(`Validating series: ${seriesSlug}\n`);

const series = loadYaml(seriesPath);
if (!series) process.exit(1);

if (series.slug !== seriesSlug) {
  console.error(`FAIL slug: manifest has "${series.slug}", expected "${seriesSlug}"`);
  failed = true;
} else {
  console.log(`OK   slug: ${series.slug}`);
}

if (!VALID_SERIES_STATUSES.has(series.status)) {
  console.error(`FAIL status: invalid "${series.status}"`);
  failed = true;
} else {
  console.log(`OK   status: ${series.status}`);
}

const parts = series.parts ?? [];
const totalParts = Number(series.total_parts);

if (!Number.isFinite(totalParts) || totalParts < 1) {
  console.error("FAIL total_parts: must be a positive number");
  failed = true;
} else if (parts.length !== totalParts) {
  console.error(
    `FAIL total_parts: declared ${totalParts} but parts[] has ${parts.length} entries`
  );
  failed = true;
} else {
  console.log(`OK   total_parts: ${totalParts}`);
}

for (const part of parts) {
  const partNum = Number(part.part);
  const expectedSlug = expectedPartSlug(seriesSlug, partNum);

  console.log(`\nPart ${partNum}: ${part.title ?? "(no title)"}`);

  if (part.slug !== expectedSlug) {
    console.error(`  FAIL slug: "${part.slug}" expected "${expectedSlug}"`);
    failed = true;
  } else {
    console.log(`  OK   slug: ${part.slug}`);
  }

  if (!VALID_PART_STATUSES.has(part.status)) {
    console.error(`  FAIL status: invalid "${part.status}"`);
    failed = true;
  } else {
    console.log(`  OK   status: ${part.status}`);
  }

  if (part.status === "planned") continue;

  const articleManifestPath = join(
    process.cwd(),
    "articles",
    "drafts",
    part.slug,
    "manifest.yaml"
  );
  const article = loadYaml(articleManifestPath);

  if (!article) {
    console.error(`  FAIL article manifest missing for non-planned part`);
    failed = true;
    continue;
  }

  if (article.series !== seriesSlug) {
    console.error(
      `  FAIL article.series: "${article.series}" expected "${seriesSlug}"`
    );
    failed = true;
  } else {
    console.log(`  OK   article.series: ${article.series}`);
  }

  const articlePart = Number(article.part);
  if (articlePart !== partNum) {
    console.error(`  FAIL article.part: ${articlePart} expected ${partNum}`);
    failed = true;
  } else {
    console.log(`  OK   article.part: ${articlePart}`);
  }

  if (article.status !== part.status) {
    console.warn(
      `  WARN status mismatch: series=${part.status}, article=${article.status}`
    );
  }
}

console.log("");
if (failed) {
  console.error("Validation failed.");
  process.exit(1);
}

console.log("Series validation passed.");
