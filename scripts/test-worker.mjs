#!/usr/bin/env node
/**
 * Tests for the NAS worker (POK-637).
 *
 * Runs the worker end to end against a local bare git repo (cloned from this
 * repo's HEAD) standing in for GitHub, plus mock Ollama and GitHub API servers.
 * Only `draftsmith new` is stubbed, because real ingestion needs the network.
 */

import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseJobFile, newCommandArgs } from "./lib/inbox.mjs";
import { createWorker, parseRepoPath, defaultForgeApi, redact, buildPrBody } from "./lib/worker.mjs";
import { buildManifestYaml } from "./lib/manifest-schema.mjs";

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

// --- job files --------------------------------------------------------------

{
  const job = parseJobFile("﻿# from my phone\nhttps://github.com/gorilla/mux\nangle: Show mux.Vars\nchannels: medium, tommarler\n");
  assert(job.url === "https://github.com/gorilla/mux" && job.slug === "mux-gorilla", "job: URL + derived slug");
  assert(job.angle === "Show mux.Vars" && job.channels.join() === "medium,tommarler", "job: options parsed");
  assert(
    newCommandArgs(job).join(" ") ===
      "new https://github.com/gorilla/mux --slug mux-gorilla --channels medium,tommarler --engine auto --json --angle Show mux.Vars",
    "job: draftsmith new args"
  );
  assert(parseJobFile("https://x.dev/post\nslug: my-post\nseries: s\npart: 2").part === 2, "job: series + part");
  assert(throws(() => parseJobFile("")), "job: empty file rejected");
  assert(throws(() => parseJobFile("not a url")), "job: non-URL rejected");
  assert(throws(() => parseJobFile("ftp://x.dev/a")), "job: non-http rejected");
  assert(throws(() => parseJobFile("https://x.dev/a\ncolour: red")), "job: unknown key rejected");
  assert(throws(() => parseJobFile("https://x.dev/a\nchannels: medium,fax")), "job: bad channel rejected");
  assert(throws(() => parseJobFile("https://x.dev/a\nseries: s")), "job: series without part rejected");
}

// --- helpers ----------------------------------------------------------------

assert(
  JSON.stringify(parseRepoPath("https://github.com/pokepitchshop/Draftsmith.git")) ===
    JSON.stringify({ owner: "pokepitchshop", repo: "Draftsmith" }),
  "parseRepoPath github https"
);
assert(parseRepoPath("git@github.com:o/r.git").repo === "r", "parseRepoPath ssh");
assert(parseRepoPath("http://192.168.1.134:3001/pokepitchshop/draftsmith.git").owner === "pokepitchshop", "parseRepoPath gitea");
assert(defaultForgeApi("gitea", "http://192.168.1.134:3001/pokepitchshop/draftsmith.git") === "http://192.168.1.134:3001/api/v1", "gitea API base derived");
assert(redact("push https://x:tok123@github.com failed", ["tok123"]) === "push https://x:***@github.com failed", "redact token");
assert(
  /❌ error[\s\S]*Needs attention[\s\S]*check failed/.test(
    buildPrBody({
      job: { url: "https://x.dev", channels: ["medium"] },
      jobFile: "a.txt",
      slug: "a",
      title: "A",
      runResult: { results: [{ step: "draft", provider: "ollama", error: "check failed" }] },
    })
  ),
  "PR body lists failed steps"
);

// --- end to end -------------------------------------------------------------

const work = mkdtempSync(join(tmpdir(), "draftsmith-worker-"));
const origin = join(work, "origin.git");
const sh = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, encoding: "utf8" });
sh("git", ["clone", "--quiet", "--bare", "--branch", "main", process.cwd(), origin]);

// Mock Ollama: markdown for prose steps, JSON for tommarler frontmatter.
let ollamaUp = true;
let badJson = false;
const ollama = createServer((req, res) => {
  if (!ollamaUp) {
    res.destroy();
    return;
  }
  if (req.url === "/api/version") {
    res.end(JSON.stringify({ version: "mock" }));
    return;
  }
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const parsed = JSON.parse(body);
    const text =
      parsed.format === "json"
        ? badJson
          ? "not json"
          : '{"description": "Mock description.", "tags": ["go", "mock"]}'
        : "I tried the thing.\n\n[Screenshot: terminal]\n\n## Recap\n\nSee you in the next article :)\n";
    res.write(JSON.stringify({ message: { content: text }, done: false }) + "\n");
    res.end(JSON.stringify({ message: { content: "" }, done: true, eval_count: 1, total_duration: 1e9 }));
  });
});

// Mock GitHub API: record PR creation.
const prs = [];
const github = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    prs.push({ url: req.url, auth: req.headers.authorization, ...JSON.parse(body) });
    res.writeHead(201, { "content-type": "application/json" });
    res.end(JSON.stringify({ html_url: `https://github.com/o/r/pull/${prs.length}` }));
  });
});

// Mock Gitea API: record PR creation.
const giteaPrs = [];
const gitea = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    giteaPrs.push({ url: req.url, auth: req.headers.authorization, ...JSON.parse(body) });
    res.writeHead(201, { "content-type": "application/json" });
    res.end(JSON.stringify({ html_url: `http://gitea.local/pokepitchshop/draftsmith/pulls/${giteaPrs.length}` }));
  });
});

await Promise.all([ollama, github, gitea].map((s) => new Promise((r) => s.listen(0, "127.0.0.1", r))));
const ollamaHost = `http://127.0.0.1:${ollama.address().port}`;
const githubApi = `http://127.0.0.1:${github.address().port}`;
const giteaApi = `http://127.0.0.1:${gitea.address().port}/api/v1`;

// Pass everything through except `draftsmith new`, which we fake (no network).
async function run(cmd, args, opts) {
  if (args[0] === "scripts/draftsmith.mjs" && args[1] === "new") {
    const job = { url: args[2], slug: args[args.indexOf("--slug") + 1], channels: args[args.indexOf("--channels") + 1].split(",") };
    const dir = join(opts.cwd, "articles", "drafts", job.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "manifest.yaml"),
      buildManifestYaml({ slug: job.slug, title: "Mock Title", channels: job.channels, sourceUrl: job.url, linkType: "article" })
    );
    writeFileSync(join(dir, "source-material.md"), "# Source\n\nFacts.\n");
    return { status: 0, stdout: JSON.stringify({ slug: job.slug, title: "Mock Title", link_type: "article" }), stderr: "" };
  }
  // Async: the mock servers live in this process, so a blocking spawn would deadlock.
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: opts?.cwd, env: { ...process.env, ...opts?.env } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolve({ status: code ?? 1, stdout, stderr }));
  });
}

const inboxDir = join(work, "inbox");
const logs = [];
const makeWorker = (extra = {}) =>
  createWorker({
    inboxDir,
    repoDir: join(work, "repo"),
    repoUrl: origin,
    forgeToken: "sekret-token",
    forgeApi: githubApi,
    forgeRepo: { owner: "o", repo: "r" },
    ollamaHost,
    run,
    log: (m) => logs.push(m),
    now: () => new Date(Date.now() + 60_000), // treat every file as settled
    ...extra,
  });

try {
  const worker = makeWorker();
  const drop = (name, text) => writeFileSync(join(inboxDir, name), text);
  const remoteFile = (branch, path) => sh("git", ["--git-dir", origin, "show", `${branch}:${path}`]);

  // Ollama down → job waits in the inbox.
  ollamaUp = false;
  drop("mux.txt", "https://example.com/blog/gorilla-mux-params\nslug: mux-params\nchannels: medium,tommarler\n");
  assert((await worker.pollOnce()) === null, "e2e: Ollama down → no job taken");
  assert(existsSync(join(inboxDir, "mux.txt")), "e2e: job stays in inbox while Ollama is down");
  assert(logs.some((l) => /not reachable/.test(l)), "e2e: logs Ollama unreachable");

  // Fresh file (still being copied) is skipped.
  ollamaUp = true;
  const fresh = makeWorker({ now: () => new Date() });
  assert((await fresh.pollOnce()) === null, "e2e: unsettled file skipped");

  // Happy path → branch pushed + PR opened.
  let result = await worker.pollOnce();
  assert(result?.ok && result.prUrl === "https://github.com/o/r/pull/1", "e2e: job → PR");
  assert(existsSync(join(inboxDir, "done", "mux.txt")), "e2e: job file moved to done/");
  assert(/PR: https:\/\/github.com\/o\/r\/pull\/1/.test(readFileSync(join(inboxDir, "done", "mux.txt.log"), "utf8")), "e2e: done log has PR URL");
  assert(remoteFile("draft/mux-params", "articles/drafts/mux-params/draft-v2.md").status === 0, "e2e: draft-v2 pushed");
  assert(
    remoteFile("draft/mux-params", "export/medium/mux-params.md").stdout.includes("<!-- image: terminal -->"),
    "e2e: medium export pushed (built in code)"
  );
  assert(
    /^description: "Mock description."/m.test(remoteFile("draft/mux-params", "export/tommarler/mux-params.md").stdout),
    "e2e: tommarler export pushed with model frontmatter"
  );
  const pr = prs[0];
  assert(pr.head === "draft/mux-params" && pr.base === "main" && pr.draft === false, "e2e: PR head/base, not draft");
  assert(pr.auth === "Bearer sekret-token" && pr.url === "/repos/o/r/pulls", "e2e: PR API call authenticated");
  assert(/\| `export-medium` \| builtin \| ✅ written \|/.test(pr.body), "e2e: PR body has step table");

  // Same slug again → branch name gets a timestamp, but slug is not on main yet so it runs.
  drop("again.txt", "https://example.com/blog/gorilla-mux-params\nslug: mux-params\n");
  result = await worker.pollOnce();
  assert(result?.ok && /^draft\/mux-params-\d{12}$/.test(result.branch), "e2e: existing remote branch → unique branch");

  // Slug already on main → failed/ with a clear message.
  drop("dupe.txt", "https://example.com/x\nslug: go-gorilla-mux-part-1\n");
  result = await worker.pollOnce();
  assert(!result.ok && /already exists on main/.test(result.error), "e2e: slug on main → failed");
  assert(existsSync(join(inboxDir, "failed", "dupe.txt.log")), "e2e: failed log written");

  // Bad job file → failed/.
  drop("bad.txt", "hello\n");
  result = await worker.pollOnce();
  assert(!result.ok && existsSync(join(inboxDir, "failed", "bad.txt")), "e2e: unparseable job → failed/");

  // Dry run → commits locally, no push / PR.
  const dry = makeWorker({ dryRun: true });
  const before = prs.length;
  drop("dry.txt", "https://example.com/blog/dry-run-post\nslug: dry-run-post\n");
  result = await dry.pollOnce();
  assert(result?.ok && result.dryRun && prs.length === before, "e2e: dry run opens no PR");
  assert(remoteFile("draft/dry-run-post", "articles/drafts/dry-run-post/manifest.yaml").status !== 0, "e2e: dry run pushes nothing");

  // Crash recovery: a file left in processing/ goes back to the inbox.
  writeFileSync(join(inboxDir, "processing", "stuck.txt"), "https://example.com/stuck\n");
  worker.recover();
  assert(existsSync(join(inboxDir, "stuck.txt")), "e2e: recover re-queues processing/ jobs");

  const allLogs = [...logs, ...readdirSync(join(inboxDir, "done")).map((f) => readFileSync(join(inboxDir, "done", f), "utf8"))].join("\n");
  assert(!allLogs.includes("sekret-token"), "e2e: token never logged");
  assert(!readFileSync(join(work, "repo", ".git", "config"), "utf8").includes("sekret"), "e2e: token not in .git/config");

  // --- Gitea review repo synced from upstream ---------------------------------
  const review = join(work, "review.git");
  sh("git", ["init", "--quiet", "--bare", "--initial-branch", "main", review]);
  const upstream = origin; // the GitHub stand-in from above
  const sha = (gitDir, ref) => sh("git", ["--git-dir", gitDir, "rev-parse", ref]).stdout.trim();
  const ancestor = (gitDir, a, b) => sh("git", ["--git-dir", gitDir, "merge-base", "--is-ancestor", a, b]).status === 0;
  let n = 0;
  const commitTo = (bare, file, text) => {
    const tmp = join(work, `scratch-${++n}`);
    sh("git", ["clone", "--quiet", bare, tmp]);
    writeFileSync(join(tmp, file), text);
    sh("git", ["-C", tmp, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "--quiet", "-am", `edit ${file}`]);
    sh("git", ["-C", tmp, "add", file]);
    sh("git", ["-C", tmp, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "--quiet", "-m", `add ${file}`]);
    sh("git", ["-C", tmp, "push", "--quiet", "origin", "HEAD:main"]);
  };

  const giteaWorker = createWorker({
    inboxDir: join(work, "inbox-gitea"),
    repoDir: join(work, "repo-gitea"),
    repoUrl: review,
    upstreamUrl: upstream,
    forge: "gitea",
    forgeApi: giteaApi,
    forgeToken: "gitea-tok",
    forgeRepo: { owner: "pokepitchshop", repo: "draftsmith" },
    ollamaHost,
    run,
    log: (m) => logs.push(m),
    now: () => new Date(Date.now() + 60_000),
  });
  const dropG = (name, text) => writeFileSync(join(work, "inbox-gitea", name), text);

  dropG("g1.txt", "https://example.com/blog/first\nslug: gitea-first\n");
  result = await giteaWorker.pollOnce();
  assert(result?.ok && sha(review, "main") === sha(upstream, "main"), "gitea: empty review repo seeded from upstream main");
  assert(sha(review, "draft/gitea-first") !== "draft/gitea-first", "gitea: draft branch pushed to review repo");
  const gpr = giteaPrs[0];
  assert(gpr.url === "/api/v1/repos/pokepitchshop/draftsmith/pulls" && gpr.auth === "token gitea-tok", "gitea: PR via Gitea API + token auth");
  assert(gpr.base === "main" && gpr.head === "draft/gitea-first" && !gpr.title.startsWith("WIP"), "gitea: PR head/base, not WIP");
  assert(result.prUrl === "http://gitea.local/pokepitchshop/draftsmith/pulls/1", "gitea: PR URL returned");

  commitTo(upstream, "UPSTREAM_A.md", "a\n");
  dropG("g2.txt", "https://example.com/blog/second\nslug: gitea-second\n");
  result = await giteaWorker.pollOnce();
  assert(result?.ok && sha(review, "main") === sha(upstream, "main"), "gitea: upstream change fast-forwarded into review main");

  commitTo(review, "APPROVED.md", "merged draft\n"); // a PR merged in Gitea
  commitTo(upstream, "UPSTREAM_B.md", "b\n");
  const reviewBefore = sha(review, "main");
  dropG("g3.txt", "https://example.com/blog/third\nslug: gitea-third\n");
  result = await giteaWorker.pollOnce();
  assert(
    result?.ok && ancestor(review, reviewBefore, "main") && ancestor(review, sha(upstream, "main"), "main"),
    "gitea: diverged mains merged (approved drafts kept, upstream added)"
  );
  assert(
    sh("git", ["--git-dir", review, "show", "draft/gitea-third:APPROVED.md"]).status === 0 &&
      sh("git", ["--git-dir", review, "show", "draft/gitea-third:UPSTREAM_B.md"]).status === 0,
    "gitea: new draft based on merged main"
  );

  commitTo(review, "CONFLICT.md", "review side\n");
  commitTo(upstream, "CONFLICT.md", "upstream side\n");
  const reviewMain = sha(review, "main");
  dropG("g4.txt", "https://example.com/blog/fourth\nslug: gitea-fourth\n");
  result = await giteaWorker.pollOnce();
  assert(!result.ok && /conflicts with review main/.test(result.error), "gitea: conflicting mains → job fails");
  assert(sha(review, "main") === reviewMain, "gitea: review main untouched on conflict");
  // Resolve by hand for the next case: review main takes upstream's side.
  sh("git", ["--git-dir", upstream, "push", "--quiet", "--force", review, "main:main"]);

  badJson = true;
  dropG("g5.txt", "https://example.com/blog/fifth\nslug: gitea-fifth\nchannels: medium, tommarler\n");
  result = await giteaWorker.pollOnce();
  badJson = false;
  const wip = giteaPrs.at(-1);
  assert(result?.ok && wip.title.startsWith("WIP: ") && /Needs attention/.test(wip.body), "gitea: step error → WIP PR with details");
  assert(!readFileSync(join(work, "repo-gitea", ".git", "config"), "utf8").includes("gitea-tok"), "gitea: token not in .git/config");
} finally {
  ollama.close();
  github.close();
  gitea.close();
  rmSync(work, { recursive: true, force: true });
}

console.log("");
if (failed) {
  console.error(`${failed} test(s) failed.`);
  process.exit(1);
}
console.log("All worker tests passed.");
