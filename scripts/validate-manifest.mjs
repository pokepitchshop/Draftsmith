#!/usr/bin/env node
/**
 * Validate article manifest.yaml (POK-420).
 * Usage: node scripts/validate-manifest.mjs [slug]
 *        node scripts/validate-manifest.mjs --all
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseManifest, validateManifest } from "./lib/manifest-schema.mjs";

const arg = process.argv[2];

if (!arg) {
  console.error("Usage: node scripts/validate-manifest.mjs <slug>");
  console.error("       node scripts/validate-manifest.mjs --all");
  process.exit(1);
}

function validateSlug(slug) {
  const manifestPath = join(process.cwd(), "articles", "drafts", slug, "manifest.yaml");
  let failed = false;

  console.log(`Validating manifest: ${slug}\n`);

  if (!existsSync(manifestPath)) {
    console.error(`Missing: ${manifestPath}`);
    return false;
  }

  const manifest = parseManifest(readFileSync(manifestPath, "utf8"));
  const result = validateManifest(manifest, slug);

  if (!result.errors.length && manifest.slug === slug) {
    console.log(`OK   slug: ${manifest.slug}`);
  }
  if (!result.errors.some((e) => e.startsWith("title:")) && manifest.title) {
    console.log(`OK   title: ${manifest.title}`);
  }
  if (manifest.channels?.length && !result.errors.some((e) => e.startsWith("channels:"))) {
    console.log(`OK   channels: ${manifest.channels.join(", ")}`);
  }
  if (manifest.link_type && !result.errors.some((e) => e.startsWith("link_type:"))) {
    console.log(`OK   link_type: ${manifest.link_type}`);
  }
  if (manifest.source_url && !result.errors.some((e) => e.startsWith("source_url:"))) {
    console.log(`OK   source_url: ${manifest.source_url}`);
  }
  if (manifest.status && !result.errors.some((e) => e.startsWith("status:"))) {
    console.log(`OK   status: ${manifest.status}`);
  }

  for (const warning of result.warnings) {
    console.warn(`WARN ${warning}`);
  }
  if (
    manifest.source_url &&
    !result.warnings.some((w) => w.includes("source-material")) &&
    existsSync(join(process.cwd(), "articles", "drafts", slug, "source-material.md"))
  ) {
    console.log("OK   source-material.md exists");
  }

  for (const error of result.errors) {
    console.error(`FAIL ${error}`);
    failed = true;
  }

  console.log("");
  if (failed) {
    console.error("Validation failed.");
    return false;
  }

  console.log("Manifest validation passed.");
  return true;
}

if (arg === "--all") {
  const draftsDir = join(process.cwd(), "articles", "drafts");
  const slugs = readdirSync(draftsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((slug) =>
      existsSync(join(draftsDir, slug, "manifest.yaml"))
    );

  let allOk = true;
  for (const slug of slugs) {
    if (!validateSlug(slug)) allOk = false;
  }
  process.exit(allOk ? 0 : 1);
}

process.exit(validateSlug(arg) ? 0 : 1);
