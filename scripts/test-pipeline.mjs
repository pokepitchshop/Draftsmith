#!/usr/bin/env node
/**
 * Tests for the pipeline step registry + runner (POK-634, POK-635, POK-636).
 * The ollama provider runs against a local mock /api/chat server.
 */

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { buildManifestYaml, parseManifest } from "./lib/manifest-schema.mjs";
import { planSteps, resolvePipeline, runPipeline, splitOutputs, checkParagraphsPreserved, STEPS } from "./lib/pipeline.mjs";
import { getPipelineStatus } from "./lib/link-draft.mjs";
import { DEFAULT_CONFIG, normalizeHost, resolveStepSettings } from "./lib/config.mjs";
import { cleanModelOutput } from "./lib/ollama.mjs";
import { buildExportBody, parseFrontmatterReply } from "./lib/export-markdown.mjs";

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    failed++;
  } else {
    console.log(`OK   ${message}`);
  }
}

async function rejects(fn) {
  try {
    await fn();
    return false;
  } catch {
    return true;
  }
}

const ids = (steps) => steps.map((s) => s.id).join(",");

// --- registry ---------------------------------------------------------------

assert(ids(planSteps(["medium"])) === "draft,self-edit,check,export-medium", "plan for medium");
assert(
  ids(planSteps(["x", "medium"])) === "draft,self-edit,check,export-x,export-medium",
  "exports follow manifest channel order"
);
assert(ids(planSteps(["bogus"])) === "draft,self-edit,check", "unknown channel ignored");

// --- config -----------------------------------------------------------------

assert(normalizeHost("0.0.0.0:11434") === "http://localhost:11434", "OLLAMA_HOST 0.0.0.0 form normalized");
assert(normalizeHost("http://nas.local:11434") === "http://nas.local:11434", "OLLAMA_HOST URL kept");
{
  const cfg = { ...DEFAULT_CONFIG, steps: { "export-x": { provider: "ollama", model: "small:1b" } } };
  assert(resolveStepSettings(cfg, "draft").provider === "agent", "default provider is agent");
  assert(resolveStepSettings(cfg, "export-x").ollama.model === "small:1b", "per-step model override");
  assert(
    resolveStepSettings(cfg, "export-x", { provider: "agent" }).provider === "agent",
    "CLI provider beats step config"
  );
}

// --- output parsing ---------------------------------------------------------

assert(cleanModelOutput("<think>hmm</think>\n# Title\n") === "# Title\n", "strips <think> block");
assert(cleanModelOutput("```markdown\n# Title\n```") === "# Title\n", "strips whole-file fence");
assert(
  cleanModelOutput("# T\n\n```go\nx\n```") === "# T\n\n```go\nx\n```\n",
  "keeps inner code fences"
);
{
  const parts = splitOutputs("<<<FILE: a.md>>>\nA\n<<<FILE: b.md>>>\nB\n", ["a.md", "b.md"]);
  assert(parts["a.md"].trim() === "A" && parts["b.md"].trim() === "B", "splits multi-file reply");
  assert(
    await rejects(() => splitOutputs("<<<FILE: a.md>>>\nA\n", ["a.md", "b.md"])),
    "missing file section throws"
  );
}

// --- code exporter ----------------------------------------------------------

{
  const draft = [
    "---",
    "title: x",
    "---",
    "Intro.",
    "",
    "[Screenshot: terminal output]",
    "",
    "```markdown",
    "---",
    "[Screenshot: inside fence stays]",
    "## Draft notes inside fence stays",
    "```",
    "",
    "## Draft notes",
    "",
    "TODO internal",
    "",
    "### Sub-note",
    "",
    "still internal",
    "",
    "## Recap",
    "",
    "Done :)",
    "",
  ].join("\n");
  const body = buildExportBody(draft);
  assert(body.startsWith("Intro."), "exporter strips leading frontmatter");
  assert(body.includes("<!-- image: terminal output -->"), "exporter converts screenshot markers");
  assert(
    body.includes("---\n[Screenshot: inside fence stays]\n## Draft notes inside fence stays"),
    "exporter leaves code fences untouched"
  );
  assert(!body.includes("TODO internal") && !body.includes("still internal"), "exporter drops Draft notes section");
  assert(body.endsWith("## Recap\n\nDone :)\n"), "exporter resumes after Draft notes");
  assert(buildExportBody(body) === body, "exporter is idempotent");
}

{
  const r = parseFrontmatterReply('{"description": "Build a thing.", "tags": ["Go", "gorilla mux", "go"]}');
  assert(r.description === "Build a thing." && r.tags.join(",") === "go,gorilla-mux", "frontmatter tags normalized + deduped");
  assert(await rejects(() => parseFrontmatterReply('{"description": "x", "tags": ["go"]}')), "frontmatter needs 2+ tags");
  assert(await rejects(() => parseFrontmatterReply("no json here")), "frontmatter rejects non-JSON");
}

// --- export paragraph check -------------------------------------------------

{
  const src = "Opening why.\n\n## How?\n\nBody with https://x.dev/a\n\n[Screenshot: thing]\n\n## Draft notes\n\nTODO cut";
  assert(
    checkParagraphsPreserved(src, "# Title\n\nOpening why.\n\n## How?\n\nBody with [https://x.dev/a](https://x.dev/a)\n\n<!-- image: thing -->") === null,
    "export check passes: screenshots, draft notes, linkified URL ignored"
  );
  assert(
    /1 paragraph\(s\)[\s\S]*Opening why/.test(checkParagraphsPreserved(src, "## How?\n\nBody with https://x.dev/a") ?? ""),
    "export check flags dropped opening paragraph"
  );
}

// --- fixture repo -----------------------------------------------------------

function makeRoot(channels) {
  const root = mkdtempSync(join(tmpdir(), "draftsmith-pipeline-"));
  const slug = "test-slug";
  const write = (path, content) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };

  write(
    `articles/drafts/${slug}/manifest.yaml`,
    buildManifestYaml({ slug, title: "Test", channels, sourceUrl: "https://example.com", linkType: "article" })
  );
  write(`articles/drafts/${slug}/source-material.md`, "# Source\n");
  for (const step of STEPS) if (step.prompt) write(step.prompt, `Prompt ${step.id} for {slug}\n`);
  for (const file of [
    "style/iostom-style-guide.md",
    "style/x-social-guide.md",
    "templates/article-template.md",
    "templates/export-medium.md",
    "templates/export-tommarler.md",
    "templates/export-x-thread.md",
    "templates/export-x-single.md",
  ]) {
    write(file, `${file}\n`);
  }

  return { root, slug, write, draftDir: join(root, "articles", "drafts", slug) };
}

const statusOf = (root, slug) =>
  parseManifest(readFileSync(join(root, "articles", "drafts", slug, "manifest.yaml"), "utf8")).status;

// --- agent provider ---------------------------------------------------------

{
  const { root, slug, draftDir } = makeRoot(["medium", "x"]);
  try {
    let run = await runPipeline(slug, { rootDir: root });
    assert(run.results.length === 1 && run.results[0].step === "draft", "agent stops after first handoff");
    assert(run.results[0].message.includes("07-draft-from-link"), "draft handoff message");

    writeFileSync(join(draftDir, "draft.md"), "# draft");
    run = await runPipeline(slug, { rootDir: root });
    assert(run.results[0].step === "self-edit", "advances to self-edit");

    run = await runPipeline(slug, { rootDir: root, until: "self-edit" });
    assert(run.results.length === 0, "--until stops before step");

    rmSync(join(draftDir, "draft.md"));
    writeFileSync(join(draftDir, "draft-v2.md"), "# v2");
    run = await runPipeline(slug, { rootDir: root });
    assert(run.results.map((r) => r.step).join() === "check,export-medium,export-x", "draft-v2 without draft.md skips draft");
    assert(run.results[0].provider === "builtin" && /0 failed/.test(run.results[0].summary), "agent: code check runs in code");
    assert(getPipelineStatus(slug, root).files.draft === false, "status still reports draft.md missing");

    assert(run.results[1].provider === "builtin" && !run.results[1].handoff, "agent: medium export runs in code");
    assert(readFileSync(join(root, "export", "medium", `${slug}.md`), "utf8") === "# v2\n", "agent: medium export written");
    assert(run.results[2].blocked && /canonical_url/.test(run.results[2].reason), "export-x blocked without canonical_url");
    assert(statusOf(root, slug) === "exported", "agent: builtin step advances status");

    mkdirSync(join(root, "export", "x", slug), { recursive: true });
    writeFileSync(join(root, "export", "x", slug, "thread.md"), "thread");
    run = await runPipeline(slug, { rootDir: root });
    assert(run.complete && run.results.length === 0, "complete when all outputs exist");
    assert(resolvePipeline(slug, root).next === null, "no next step when complete");

    assert(await rejects(() => runPipeline(slug, { rootDir: root, provider: "nope" })), "unknown provider throws");
    assert(await rejects(() => runPipeline(slug, { rootDir: root, until: "nope" })), "unknown --until throws");
    assert(await rejects(() => runPipeline("missing", { rootDir: root })), "missing slug throws");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// --- ollama provider (mock server) ------------------------------------------

const requests = [];
let reply = () => "# Reply\n";

const server = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const parsed = JSON.parse(body);
    requests.push(parsed);
    const text = reply(parsed);
    res.writeHead(200, { "content-type": "application/x-ndjson" });
    // Split across chunks to exercise stream reassembly.
    const mid = Math.floor(text.length / 2);
    res.write(JSON.stringify({ message: { content: text.slice(0, mid) }, done: false }) + "\n");
    res.write(JSON.stringify({ message: { content: text.slice(mid) }, done: false }) + "\n");
    res.end(JSON.stringify({ message: { content: "" }, done: true, eval_count: 42, total_duration: 2e9 }));
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const host = `http://127.0.0.1:${server.address().port}`;
const ollamaConfig = (extra = {}) => ({
  ...DEFAULT_CONFIG,
  ollama: { ...DEFAULT_CONFIG.ollama, host, ...extra },
});

try {
  {
    const { root, slug, draftDir } = makeRoot(["medium"]);
    try {
      reply = (req) =>
        req.messages[1].content.includes("Prompt draft") ? "<think>plan</think>\n# Draft body\n" : "# Next\n";
      const events = [];
      const run = await runPipeline(slug, {
        rootDir: root,
        provider: "ollama",
        config: ollamaConfig(),
        onEvent: (e) => events.push(e.type),
      });

      assert(run.complete, "ollama runs every step to completion");
      assert(ids(run.results.map((r) => ({ id: r.step }))) === "draft,self-edit,check,export-medium", "ollama step order");
      assert(readFileSync(join(draftDir, "draft.md"), "utf8") === "# Draft body\n", "draft.md written, <think> stripped");
      assert(existsSync(join(draftDir, "draft-v2.md")), "draft-v2.md written");
      assert(existsSync(join(root, "export", "medium", `${slug}.md`)), "medium export written");
      assert(statusOf(root, slug) === "exported", "manifest status advanced to exported");
      assert(events.includes("start") && events.includes("progress") && events.includes("done"), "progress events emitted");

      const first = requests[0];
      assert(first.model === "qwen3:8b" && first.options.num_ctx === 16384, "model + num_ctx sent");
      assert(first.messages[1].content.includes("Prompt draft for test-slug"), "{slug} substituted in prompt");
      assert(first.messages[1].content.includes('<file path="templates/article-template.md">'), "inputs inlined");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  {
    const { root, slug, write } = makeRoot(["x"]);
    try {
      write(`articles/drafts/${slug}/draft-v2.md`, "# v2\n");
      const manifestPath = join(root, "articles", "drafts", slug, "manifest.yaml");
      writeFileSync(
        manifestPath,
        readFileSync(manifestPath, "utf8").replace("canonical_url: null", "canonical_url: https://example.com/post")
      );
      write("scripts/validate-x-export.mjs", "process.exit(0);\n");

      reply = () =>
        `<<<FILE: export/x/${slug}/thread.md>>>\n## Tweet 1\nhi\n<<<FILE: export/x/${slug}/single.md>>>\nsingle\n`;
      let run = await runPipeline(slug, { rootDir: root, provider: "ollama", config: ollamaConfig() });
      assert(run.complete, "export-x completes via ollama");
      assert(
        readFileSync(join(root, "export", "x", slug, "single.md"), "utf8") === "single\n",
        "multi-file reply written to both outputs"
      );

      rmSync(join(root, "export", "x", slug), { recursive: true });
      write("scripts/validate-x-export.mjs", "console.error('tweet over 280'); process.exit(1);\n");
      run = await runPipeline(slug, { rootDir: root, provider: "ollama", config: ollamaConfig() });
      assert(/validation failed[\s\S]*tweet over 280/.test(run.results[0].error ?? ""), "validator failure reported");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  {
    const { root, slug, write } = makeRoot(["tommarler"]);
    try {
      write(`articles/drafts/${slug}/draft-v2.md`, "Intro.\n\n[Screenshot: shot]\n");

      let run = await runPipeline(slug, { rootDir: root });
      const tm = run.results.find((r) => r.step === "export-tommarler");
      assert(run.results[0].step === "check" && tm?.handoff, "agent: tommarler still hands off");

      const before = requests.length;
      reply = () => '{"description": "Learn the thing, step by step.", "tags": ["go", "HTTP"]}';
      run = await runPipeline(slug, { rootDir: root, provider: "ollama", config: ollamaConfig() });
      const out = readFileSync(join(root, "export", "tommarler", `${slug}.md`), "utf8");
      const today = new Date().toLocaleDateString("en-CA");
      assert(run.complete && run.results[0].provider === "builtin+ollama", "ollama: tommarler via builtin");
      assert(
        out === `---\ntitle: "Test"\ndescription: "Learn the thing, step by step."\npublishedAt: "${today}"\ntags: [go, http]\n---\n\nIntro.\n\n<!-- image: shot -->\n`,
        "tommarler frontmatter from model + body from code"
      );
      assert(requests.length === before + 1 && requests.at(-1).format === "json", "tommarler asks model for JSON only");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  {
    const { root, slug } = makeRoot(["medium"]);
    try {
      const before = requests.length;
      const run = await runPipeline(slug, { rootDir: root, provider: "ollama", config: ollamaConfig({ num_ctx: 2048 }) });
      assert(/over num_ctx 2048/.test(run.results[0].error ?? ""), "context guard trips before sending");
      assert(requests.length === before, "no request sent when over num_ctx");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  {
    const { root, slug } = makeRoot(["medium"]);
    try {
      const run = await runPipeline(slug, {
        rootDir: root,
        provider: "ollama",
        config: ollamaConfig({ host: "http://127.0.0.1:1" }),
      });
      assert(/cannot reach/.test(run.results[0].error ?? ""), "unreachable host reported");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
} finally {
  server.close();
}

console.log("");
if (failed) {
  console.error(`${failed} test(s) failed.`);
  process.exit(1);
}
console.log("All pipeline tests passed.");
