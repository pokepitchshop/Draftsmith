#!/usr/bin/env node
/**
 * Smoke tests for manifest schema validation (POK-420).
 */

import { parseManifest, validateManifest, buildManifestYaml, validateChannels } from "./lib/manifest-schema.mjs";

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    failed++;
  } else {
    console.log(`OK   ${message}`);
  }
}

const validYaml = buildManifestYaml({
  slug: "test-article",
  title: "Test Title",
  channels: ["medium", "x"],
  sourceUrl: "https://example.com/docs",
  linkType: "docs",
  angle: "Try the thing",
});

const parsed = parseManifest(validYaml);
assert(parsed.slug === "test-article", "parse slug");
assert(parsed.channels.length === 2, "parse channels list");
assert(parsed.published.medium === null, "parse published block");

const validResult = validateManifest(parsed, "test-article", { draftDir: "/tmp" });
assert(validResult.ok, "valid manifest passes");

const badChannels = validateChannels(["medium", "pokepitchshop"]);
assert(badChannels.length === 1, "reject invalid channel");

const seriesYaml = `slug: part-one
title: "Part 1"
channels:
  - medium
series: my-series
part: null
status: draft
published:
  medium: null
  tommarler: null
  x: null
`;
const seriesResult = validateManifest(parseManifest(seriesYaml), "part-one", { draftDir: "/tmp" });
assert(!seriesResult.ok, "series without part fails");

console.log("");
if (failed) {
  console.error(`${failed} test(s) failed.`);
  process.exit(1);
}
console.log("All manifest schema tests passed.");
