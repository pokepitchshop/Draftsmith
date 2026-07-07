#!/usr/bin/env node
/**
 * Smoke tests for drop-link CLI helpers (POK-426).
 */

import { slugFromUrl, isValidSlug } from "./lib/slug-from-url.mjs";
import { buildCursorPrompts } from "./lib/link-draft.mjs";

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    failed++;
  } else {
    console.log(`OK   ${message}`);
  }
}

assert(isValidSlug(slugFromUrl("https://github.com/gorilla/mux")), "github slug valid");
assert(slugFromUrl("https://github.com/gorilla/mux") === "mux-gorilla", "github slug pattern");

assert(
  isValidSlug(slugFromUrl("https://docs.spring.io/spring-ai/reference/api/chatclient.html")),
  "docs slug valid"
);

assert(isValidSlug(slugFromUrl("https://cursor.com/docs/rules")), "cursor docs slug valid");

const prompts = buildCursorPrompts("my-slug", ["medium", "x"]);
assert(prompts.length === 4, "prompts for medium + x");
assert(prompts[0].message.includes("07-draft-from-link"), "draft prompt present");
assert(prompts.some((p) => p.file.includes("04-export-medium")), "medium export prompt");

console.log("");
if (failed) {
  console.error(`${failed} test(s) failed.`);
  process.exit(1);
}
console.log("All drop-link tests passed.");
