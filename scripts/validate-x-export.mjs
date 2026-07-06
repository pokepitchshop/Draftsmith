#!/usr/bin/env node
/**
 * Validate X export files for a slug — every tweet must be ≤280 characters.
 * Usage: node scripts/validate-x-export.mjs [slug]
 * Example: node scripts/validate-x-export.mjs go-gorilla-mux-part-1
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const MAX_TWEET_LENGTH = 280;
const slug = process.argv[2];

if (!slug) {
  console.error("Usage: node scripts/validate-x-export.mjs <slug>");
  process.exit(1);
}

const base = join(process.cwd(), "export", "x", slug);
const threadPath = join(base, "thread.md");
const singlePath = join(base, "single.md");

let failed = false;

function stripCharCount(line) {
  return line.replace(/\s*\(\d+\s*chars?\)\s*$/i, "").trim();
}

function validateThread(path) {
  if (!existsSync(path)) {
    console.error(`Missing: ${path}`);
    return false;
  }

  const content = readFileSync(path, "utf8");
  const sections = content.split(/^## Tweet/m).slice(1);
  let ok = true;

  for (const section of sections) {
    const header = section.match(/^[^\n]*/)?.[0] ?? "";
    const body = section.replace(/^[^\n]*\n?/, "").trim();
    const tweetText = stripCharCount(body.split("\n").filter(Boolean).join("\n"));
    const len = tweetText.length;

    if (len > MAX_TWEET_LENGTH) {
      console.error(`FAIL ${header.trim()}: ${len} chars (max ${MAX_TWEET_LENGTH})`);
      console.error(`  ${tweetText.slice(0, 80)}...`);
      ok = false;
    } else {
      console.log(`OK   ${header.trim()}: ${len} chars`);
    }
  }

  return ok;
}

function validateSingle(path) {
  if (!existsSync(path)) {
    console.error(`Missing: ${path}`);
    return false;
  }

  const lines = readFileSync(path, "utf8").split("\n");
  const tweetLine = lines.find((l) => l.startsWith("New:") || (!l.startsWith("#") && l.trim()));
  if (!tweetLine) {
    console.error("FAIL single.md: no tweet line found");
    return false;
  }

  const tweetText = stripCharCount(tweetLine.trim());
  const len = tweetText.length;

  if (len > MAX_TWEET_LENGTH) {
    console.error(`FAIL single tweet: ${len} chars (max ${MAX_TWEET_LENGTH})`);
    return false;
  }

  console.log(`OK   single tweet: ${len} chars`);
  return true;
}

console.log(`Validating X exports for: ${slug}\n`);

if (!validateThread(threadPath)) failed = true;
console.log("");
if (!validateSingle(singlePath)) failed = true;

if (failed) {
  console.error("\nValidation failed.");
  process.exit(1);
}

console.log("\nAll tweets within 280 characters.");
