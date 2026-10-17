#!/usr/bin/env node
/**
 * Tests for the pipeline step registry + runner (POK-634).
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildManifestYaml } from "./lib/manifest-schema.mjs";
import { planSteps, resolvePipeline, runPipeline } from "./lib/pipeline.mjs";
import { getPipelineStatus } from "./lib/link-draft.mjs";

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    failed++;
  } else {
    console.log(`OK   ${message}`);
  }
}

function throws(fn) {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

const ids = (steps) => steps.map((s) => s.id).join(",");

assert(ids(planSteps(["medium"])) === "draft,self-edit,export-medium", "plan for medium");
assert(
  ids(planSteps(["x", "medium"])) === "draft,self-edit,export-x,export-medium",
  "exports follow manifest channel order"
);
assert(ids(planSteps(["bogus"])) === "draft,self-edit", "unknown channel ignored");

const root = mkdtempSync(join(tmpdir(), "draftsmith-pipeline-"));
const slug = "test-slug";
const draftDir = join(root, "articles", "drafts", slug);
mkdirSync(draftDir, { recursive: true });
writeFileSync(
  join(draftDir, "manifest.yaml"),
  buildManifestYaml({
    slug,
    title: "Test",
    channels: ["medium", "x"],
    sourceUrl: "https://example.com",
    linkType: "article",
  })
);

try {
  let run = runPipeline(slug, { rootDir: root });
  assert(run.results.length === 1 && run.results[0].step === "draft", "agent stops after first handoff");
  assert(run.results[0].message.includes("07-draft-from-link"), "draft handoff message");

  writeFileSync(join(draftDir, "draft.md"), "# draft");
  run = runPipeline(slug, { rootDir: root });
  assert(run.results[0].step === "self-edit", "advances to self-edit");

  run = runPipeline(slug, { rootDir: root, until: "self-edit" });
  assert(run.results.length === 0, "--until stops before step");

  rmSync(join(draftDir, "draft.md"));
  writeFileSync(join(draftDir, "draft-v2.md"), "# v2");
  run = runPipeline(slug, { rootDir: root });
  assert(run.results[0].step === "export-medium", "draft-v2 without draft.md skips draft");
  assert(getPipelineStatus(slug, root).files.draft === false, "status still reports draft.md missing");

  mkdirSync(join(root, "export", "medium"), { recursive: true });
  writeFileSync(join(root, "export", "medium", `${slug}.md`), "medium");
  mkdirSync(join(root, "export", "x", slug), { recursive: true });
  writeFileSync(join(root, "export", "x", slug, "thread.md"), "thread");
  run = runPipeline(slug, { rootDir: root });
  assert(run.complete && run.results.length === 0, "complete when all outputs exist");
  assert(resolvePipeline(slug, root).next === null, "no next step when complete");

  assert(throws(() => runPipeline(slug, { rootDir: root, provider: "nope" })), "unknown provider throws");
  assert(throws(() => runPipeline(slug, { rootDir: root, until: "nope" })), "unknown --until throws");
  assert(throws(() => runPipeline("missing", { rootDir: root })), "missing slug throws");
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log("");
if (failed) {
  console.error(`${failed} test(s) failed.`);
  process.exit(1);
}
console.log("All pipeline tests passed.");
