#!/usr/bin/env node
/**
 * Tests for the code-check step (POK-638). Go cases need the go toolchain and
 * network access to the module proxy; they are skipped (and reported) without go.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractCodeBlocks, checkCodeBlocks, shellSource, goGetTargets, buildCheckReport } from "./lib/code-check.mjs";
import { buildManifestYaml } from "./lib/manifest-schema.mjs";
import { runPipeline } from "./lib/pipeline.mjs";

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    failed++;
  } else {
    console.log(`OK   ${message}`);
  }
}

const hasGo = spawnSync("go", ["version"]).status === 0;
const fence = "```";

// --- parsing ----------------------------------------------------------------

{
  const md = `Intro\n\n${fence}go\npackage main\n${fence}\n\n~~~bash\ngo get x\n~~~\n\n${fence}\nplain\n${fence}\n\n${fence}markdown\n${fence}yaml\ninner\n${fence}\n${fence}\n`;
  const blocks = extractCodeBlocks(md);
  assert(blocks.length === 4, "extract: 4 blocks (tilde fences, untagged, nested-looking fence)");
  assert(blocks[0].lang === "go" && blocks[0].line === 3 && blocks[0].code === "package main", "extract: lang, line, code");
  assert(blocks[1].lang === "bash" && blocks[2].lang === "", "extract: tilde fence + untagged");
}

assert(shellSource("console", "$ go run .\nlistening on :8080\n$ curl x") === "go run .\ncurl x", "console: keep only $ lines");
assert(shellSource("bash", "$ echo hi") === "echo hi", "bash: strip $ prompt");
assert(
  goGetTargets("go mod init x\ngo get -u github.com/gorilla/mux@v1.8.1 golang.org/x/net && go build\n# go get not/this").join(",") ===
    "github.com/gorilla/mux@v1.8.1,golang.org/x/net",
  "go get targets: flags dropped, chained commands, comments ignored"
);

// --- checks without go ------------------------------------------------------

{
  const { results, counts } = await checkCodeBlocks([
    { lang: "json", line: 1, code: '{"id":"42"}' },
    { lang: "json", line: 2, code: '{"a":1}\n{"b":2}' },
    { lang: "json", line: 3, code: "{id: 42}" },
    { lang: "bash", line: 4, code: "echo hi\ncurl -s localhost:8080/users/42" },
    { lang: "bash", line: 5, code: "if then fi (" },
    { lang: "xml", line: 6, code: "<dependency><groupId>a</groupId></dependency>\n<dependency/>" },
    { lang: "xml", line: 7, code: "<properties><x></properties>" },
    { lang: "java", line: 8, code: "class A {}" },
    { lang: "", line: 9, code: "text" },
  ]);
  const s = results.map((r) => r.status).join(",");
  assert(s === "pass,pass,fail,pass,fail,pass,fail,skip,skip", `statuses json/bash/xml/java/untagged (${s})`);
  assert(counts.fail === 3 && counts.skip === 2, "counts");
  const report = buildCheckReport("demo", { results, counts });
  assert(/3 failed/.test(report) && /### Block 3 \(line 3, `json`\)/.test(report), "report lists failures");
}

{
  const missing = await checkCodeBlocks([{ lang: "xml", line: 1, code: "<a/>" }], {
    run: async () => ({ status: 127, stdout: "", stderr: "", missing: true }),
  });
  assert(missing.results[0].status === "skip" && /not installed/.test(missing.results[0].detail), "missing tool → skip with warning, not pass");
}

// --- go (real toolchain) ----------------------------------------------------

if (hasGo) {
  const good = `package main\n\nimport (\n\t"fmt"\n\t"net/http"\n\n\t"github.com/gorilla/mux"\n)\n\nfunc main() {\n\tr := mux.NewRouter()\n\tr.HandleFunc("/u/{id}", func(w http.ResponseWriter, r *http.Request) { fmt.Fprint(w, mux.Vars(r)["id"]) })\n\thttp.ListenAndServe(":8080", r)\n}`;
  const { results } = await checkCodeBlocks([
    { lang: "go", line: 1, code: good },
    { lang: "go", line: 2, code: `package main\n\nfunc main() {\n\tundefinedThing()\n}` },
    { lang: "go", line: 3, code: `r.HandleFunc("/x", h)` },
    { lang: "bash", line: 4, code: "go get github.com/gorilla/mux" },
    { lang: "bash", line: 5, code: "go get -u github.com/golang/go" },
    { lang: "bash", line: 6, code: "go get github.com/definitely-not-a-real-org-xyz/nope" },
  ]);
  const s = results.map((r) => r.status).join(",");
  assert(s === "pass,fail,skip,pass,warn,fail", `go statuses (${s})`);
  assert(/undefined: undefinedThing/.test(results[1].detail), "go vet error surfaced");
  assert(/not an importable Go package/.test(results[4].detail), "go get of github.com/golang/go warned");
} else {
  console.log("SKIP go toolchain not installed; go cases not run");
}

// --- pipeline step ----------------------------------------------------------

{
  const root = mkdtempSync(join(tmpdir(), "draftsmith-check-"));
  const slug = "demo";
  const dir = join(root, "articles", "drafts", slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "manifest.yaml"), buildManifestYaml({ slug, title: "Demo", channels: ["medium"], sourceUrl: "https://x.dev", linkType: "article" }));
  writeFileSync(join(dir, "draft-v2.md"), `Intro.\n\n${fence}json\n{bad json}\n${fence}\n`);
  try {
    let run = await runPipeline(slug, { rootDir: root });
    assert(run.results[0].step === "check" && /1 failed/.test(run.results[0].error ?? ""), "pipeline: failing check stops the run");
    assert(existsSync(join(dir, "code-check-failed.md")) && !existsSync(join(dir, "code-check.md")), "pipeline: failed report, step not done");
    assert(!existsSync(join(root, "export", "medium", `${slug}.md`)), "pipeline: no export after failed check");

    writeFileSync(join(dir, "draft-v2.md"), `Intro.\n\n${fence}json\n{"ok": true}\n${fence}\n`);
    run = await runPipeline(slug, { rootDir: root });
    assert(run.results[0].step === "check" && run.results[0].summary === "1 passed, 0 warnings, 0 failed, 0 skipped", "pipeline: re-run re-checks after fix");
    assert(existsSync(join(dir, "code-check.md")) && !existsSync(join(dir, "code-check-failed.md")), "pipeline: pass report, failed report removed");
    assert(run.complete && readFileSync(join(root, "export", "medium", `${slug}.md`), "utf8").includes('{"ok": true}'), "pipeline: exports run after pass");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = mkdtempSync(join(tmpdir(), "draftsmith-check-"));
  const slug = "frag";
  const dir = join(root, "articles", "drafts", slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "manifest.yaml"), buildManifestYaml({ slug, title: "Frag", channels: ["medium"], sourceUrl: "https://x.dev", linkType: "article" }));
  writeFileSync(join(dir, "draft-v2.md"), `Intro.\n\n${fence}go\nr.HandleFunc("/x", h)\n${fence}\n`);
  try {
    const run = await runPipeline(slug, { rootDir: root, until: "export-medium" });
    const check = run.results[0];
    assert(check.warnings === 1 && /nothing checkable/.test(check.summary), "only fragments → warning, not a clean pass");
    assert(/Nothing here could be checked automatically/.test(readFileSync(join(dir, "code-check.md"), "utf8")), "report says nothing was checkable");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

console.log("");
if (failed) {
  console.error(`${failed} test(s) failed.`);
  process.exit(1);
}
console.log("All code-check tests passed.");
