#!/usr/bin/env node
/**
 * Draftsmith NAS worker (POK-637): watch an inbox folder, turn each dropped
 * link into a draft PR using the local Ollama provider.
 *
 * Env:
 *   INBOX_DIR      folder to watch (default /inbox)
 *   REPO_DIR       worker-owned clone (default /work/repo)
 *   REPO_URL       review repo: draft branches + PRs go here
 *   UPSTREAM_URL   optional code source; its main is synced into REPO_URL's main
 *   FORGE          github | gitea (default: github for github.com URLs, else gitea)
 *   FORGE_API      REST API base (default: api.github.com, or <REPO_URL origin>/api/v1)
 *   FORGE_TOKEN    token with repo write + PR access (GITHUB_TOKEN accepted for github)
 *   FORGE_USER     git basic-auth user for gitea (default: repo owner)
 *   GITHUB_TOKEN   with FORGE=gitea: optional, only for GitHub ingest rate limits
 *   OLLAMA_HOST    e.g. http://192.168.1.12:11434
 *   POLL_SECONDS   default 15
 *   DRY_RUN        1 = commit locally only, no push / PR
 *   ONCE           1 = process at most one job, then exit (for testing)
 */

import { normalizeHost } from "./lib/config.mjs";
import { createWorker } from "./lib/worker.mjs";

const env = process.env;
const missing = ["REPO_URL", "OLLAMA_HOST"].filter((k) => !env[k]);
if (missing.length) {
  console.error(`Missing env: ${missing.join(", ")}`);
  process.exit(1);
}

const forge = env.FORGE || (/github\.com/.test(env.REPO_URL) ? "github" : "gitea");
const forgeToken = env.FORGE_TOKEN || (forge === "github" ? env.GITHUB_TOKEN : "") || null;
const dryRun = env.DRY_RUN === "1";
if (!dryRun && !forgeToken) {
  console.error("FORGE_TOKEN is required unless DRY_RUN=1");
  process.exit(1);
}

let worker;
try {
  worker = createWorker({
    inboxDir: env.INBOX_DIR ?? "/inbox",
    repoDir: env.REPO_DIR ?? "/work/repo",
    repoUrl: env.REPO_URL,
    upstreamUrl: env.UPSTREAM_URL || null,
    forge,
    forgeApi: env.FORGE_API || null,
    forgeToken,
    forgeUser: env.FORGE_USER || null,
    ingestGithubToken: forge === "gitea" ? env.GITHUB_TOKEN || null : null,
    ollamaHost: normalizeHost(env.OLLAMA_HOST),
    dryRun,
  });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const pollMs = Number(env.POLL_SECONDS ?? 15) * 1000;
let stopping = false;
let wake = () => {};
const sleep = (ms) =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    wake = () => {
      clearTimeout(timer);
      resolve();
    };
  });

for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    console.log(`${sig} received; finishing current job before exit`);
    stopping = true;
    wake();
  });
}

console.log(
  `Draftsmith worker: ${forge} ${env.REPO_URL}${env.UPSTREAM_URL ? ` ← ${env.UPSTREAM_URL}` : ""}, ` +
    `inbox=${env.INBOX_DIR ?? "/inbox"} ollama=${env.OLLAMA_HOST} every ${pollMs / 1000}s${dryRun ? " (DRY_RUN)" : ""}`
);
worker.recover();

while (!stopping) {
  let result = null;
  try {
    result = await worker.pollOnce();
  } catch (error) {
    console.error(`poll error: ${error.message}`);
  }
  if (env.ONCE === "1" && result) break;
  if (!result) await sleep(pollMs);
}
