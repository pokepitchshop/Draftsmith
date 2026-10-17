/**
 * Code-sample checks for drafts (POK-638).
 *
 * Pulls fenced code blocks out of a draft and compiles or parses the ones we
 * can check without a project around them. Nothing is ever executed: Go is
 * only vetted (cgo off, no toolchain downloads), shell is only syntax-checked,
 * and `go get` lines are resolved in a throwaway module.
 *
 * Complete Go files are run through goimports first (POK-639): small models
 * often forget or over-include imports, which goimports fixes mechanically.
 * The fixed code is returned as `fixedCode` so the caller can write it back.
 */

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FENCE = /^(\s*)(`{3,}|~{3,})\s*([^\s`]*)/;
const SHELL_LANGS = new Set(["bash", "sh", "shell", "zsh", "console"]);
const SKIP_REASONS = {
  java: "needs the project's classpath (Spring etc.); review by hand",
  kotlin: "needs the project's classpath; review by hand",
  properties: "no checker",
  yaml: "no checker",
  yml: "no checker",
  markdown: "no checker",
  md: "no checker",
  text: "plain text",
  txt: "plain text",
  "": "untagged block",
};
const DEFAULT_TIMEOUT_MS = 120_000;
/** Pinned; used via `go run` when no goimports binary is on PATH. */
export const GOIMPORTS = "golang.org/x/tools/cmd/goimports@v0.52.0";
const DETAIL_LINES = 30;

/** Fenced blocks with language tag and 1-based line of the opening fence. */
export function extractCodeBlocks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let open = null;

  lines.forEach((line, i) => {
    const m = line.match(FENCE);
    if (!open) {
      if (m) open = { fence: m[2], lang: m[3].toLowerCase(), line: i + 1, body: [] };
      return;
    }
    if (m && m[2][0] === open.fence[0] && m[2].length >= open.fence.length && !m[3]) {
      blocks.push({ lang: open.lang, line: open.line, endLine: i + 1, code: open.body.join("\n") });
      open = null;
      return;
    }
    open.body.push(line);
  });

  return blocks;
}

function defaultRun(cmd, args, { cwd, env, timeoutMs = DEFAULT_TIMEOUT_MS, input = null } = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(cmd, args, { cwd, env: { ...process.env, ...env } });
    } catch (error) {
      resolve({ status: 127, stdout: "", stderr: error.message, missing: true });
      return;
    }
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      stderr += `\ntimed out after ${timeoutMs / 1000}s`;
    }, timeoutMs);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ status: 127, stdout, stderr: error.message, missing: error.code === "ENOENT" });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ status: code ?? 1, stdout, stderr });
    });
    child.stdin.on("error", () => {}); // e.g. EPIPE when the command is missing
    if (input != null) child.stdin.end(input);
    else child.stdin.end();
  });
}

const tail = (text) => text.trim().split("\n").slice(-DETAIL_LINES).join("\n");

/** Shell source for checking: `console` blocks keep only `$ ` lines; prompts are stripped. */
export function shellSource(lang, code) {
  const lines = code.split("\n");
  const commands = lang === "console" ? lines.filter((l) => /^\s*\$\s/.test(l)) : lines;
  return commands.map((l) => l.replace(/^\s*\$\s/, "")).join("\n");
}

/** Module paths from every `go get` invocation in a shell block (flags dropped). */
export function goGetTargets(source) {
  const targets = [];
  for (const m of source.matchAll(/(?:^|[;&|]\s*|\bthen\s+)go\s+get\s+([^;&|#\n]+)/gm)) {
    targets.push(
      ...m[1]
        .replace(/\\$/, "")
        .trim()
        .split(/\s+/)
        .filter((a) => a && !a.startsWith("-"))
    );
  }
  return targets;
}

/**
 * Check every block. Returns { results, counts } where each result is
 * { index, lang, line, status: "pass"|"warn"|"fail"|"skip", detail }.
 * Only "fail" fails the step; "warn" is surfaced for a human to look at.
 */
export async function checkCodeBlocks(blocks, { run = defaultRun, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const goEnv = { CGO_ENABLED: "0", GOTOOLCHAIN: "local", GOFLAGS: "-mod=mod" };
  const results = [];

  async function inTempDir(fn) {
    const dir = mkdtempSync(join(tmpdir(), "draftsmith-check-"));
    try {
      return await fn(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  async function goModule(dir, name) {
    const init = await run("go", ["mod", "init", name], { cwd: dir, env: goEnv, timeoutMs });
    if (init.missing) return { skip: "go toolchain not installed" };
    if (init.status !== 0) return { fail: tail(init.stderr) };
    return {};
  }

  async function checkGo(code, index) {
    if (!/^\s*package\s+\w+/m.test(code.replace(/^\s*\/\/.*$/gm, ""))) {
      return { status: "skip", detail: "fragment (no `package` clause)" };
    }
    return inTempDir(async (dir) => {
      const mod = await goModule(dir, `draftsmith.check/block${index}`);
      if (mod.skip) return { status: "skip", detail: `⚠ ${mod.skip}` };
      if (mod.fail) return { status: "fail", detail: mod.fail };
      const file = join(dir, "main.go");
      writeFileSync(file, `${code}\n`);

      // Fix imports (and gofmt) before compiling; a goimports failure is not fatal.
      let fixedCode = null;
      let imp = await run("goimports", ["-w", "main.go"], { cwd: dir, env: goEnv, timeoutMs });
      if (imp.missing) imp = await run("go", ["run", GOIMPORTS, "-w", "main.go"], { cwd: dir, env: goEnv, timeoutMs });
      if (imp.status === 0) {
        const after = readFileSync(file, "utf8").replace(/\n$/, "");
        if (after !== code) fixedCode = after;
      }
      const fixedNote = fixedCode ? "goimports fixed imports/formatting; " : "";

      for (const args of [["mod", "tidy"], ["vet", "./..."]]) {
        const r = await run("go", args, { cwd: dir, env: goEnv, timeoutMs });
        if (r.status !== 0) {
          return { status: "fail", detail: `${fixedNote}go ${args.join(" ")}:\n${tail(r.stderr || r.stdout)}`, fixedCode };
        }
      }
      return { status: "pass", detail: `${fixedNote}go vet`, fixedCode };
    });
  }

  async function checkShell(lang, code) {
    const source = shellSource(lang, code);
    const syntax = await run("bash", ["-n"], { input: source, timeoutMs });
    if (syntax.missing) return { status: "skip", detail: "⚠ bash not installed" };
    if (syntax.status !== 0) return { status: "fail", detail: `bash -n:\n${tail(syntax.stderr)}` };

    const targets = goGetTargets(source);
    if (!targets.length) return { status: "pass", detail: "bash -n" };

    return inTempDir(async (dir) => {
      const mod = await goModule(dir, "draftsmith.check/goget");
      if (mod.skip) return { status: "pass", detail: `bash -n; ⚠ go get not verified (${mod.skip})` };
      if (mod.fail) return { status: "fail", detail: mod.fail };
      const notPackages = [];
      for (const target of targets) {
        const r = await run("go", ["get", target], { cwd: dir, env: goEnv, timeoutMs });
        if (r.status !== 0) return { status: "fail", detail: `go get ${target}:\n${tail(r.stderr)}` };
        // Tutorials `go get` something the reader then imports; a path with no
        // package (e.g. github.com/golang/go) resolves but is almost always a mistake.
        const pkg = target.replace(/@.*$/, "");
        const list = await run("go", ["list", pkg], { cwd: dir, env: goEnv, timeoutMs });
        if (list.status !== 0) notPackages.push(pkg);
      }
      if (notPackages.length) {
        return {
          status: "warn",
          detail: `go get resolves, but ${notPackages.join(", ")} is not an importable Go package; is this the right path?`,
        };
      }
      return { status: "pass", detail: `bash -n; go get ${targets.join(", ")} resolves` };
    });
  }

  function checkJson(code) {
    try {
      JSON.parse(code);
      return { status: "pass", detail: "JSON.parse" };
    } catch (whole) {
      const lines = code.split("\n").filter((l) => l.trim());
      try {
        lines.forEach((l) => JSON.parse(l));
        return { status: "pass", detail: "JSON lines" };
      } catch {
        return { status: "fail", detail: `JSON.parse: ${whole.message}` };
      }
    }
  }

  async function checkXml(code) {
    const body = code.replace(/^\s*<\?xml[^>]*\?>/, "");
    const script = "import sys, xml.etree.ElementTree as ET; ET.fromstring('<root>' + sys.stdin.read() + '</root>')";
    const r = await run("python3", ["-c", script], { input: body, timeoutMs });
    if (r.missing) return { status: "skip", detail: "⚠ python3 not installed" };
    if (r.status !== 0) return { status: "fail", detail: `not well-formed XML:\n${tail(r.stderr).split("\n").at(-1)}` };
    return { status: "pass", detail: "well-formed" };
  }

  for (const [i, block] of blocks.entries()) {
    const index = i + 1;
    let outcome;
    if (block.lang === "go") outcome = await checkGo(block.code, index);
    else if (SHELL_LANGS.has(block.lang)) outcome = await checkShell(block.lang, block.code);
    else if (block.lang === "json") outcome = checkJson(block.code);
    else if (block.lang === "xml") outcome = await checkXml(block.code);
    else outcome = { status: "skip", detail: SKIP_REASONS[block.lang] ?? "no checker" };
    results.push({ index, lang: block.lang || "(none)", line: block.line, ...outcome });
  }

  const counts = { pass: 0, warn: 0, fail: 0, skip: 0 };
  for (const r of results) counts[r.status]++;
  return { results, counts };
}

/**
 * Replace the bodies of fenced blocks with fixed code. `fixes` maps a block's
 * opening-fence line (1-based) to its new body. Lines outside blocks are untouched.
 */
export function applyBlockFixes(markdown, blocks, fixes) {
  const lines = markdown.split("\n");
  const targets = blocks.filter((b) => fixes.has(b.line)).sort((a, b) => b.line - a.line);
  for (const b of targets) {
    // Body occupies lines (line+1 .. endLine-1), i.e. indices line .. endLine-2.
    lines.splice(b.line, b.endLine - b.line - 1, ...fixes.get(b.line).split("\n"));
  }
  return lines.join("\n");
}

/**
 * Go blocks that are all fragments mean the reader never sees a complete,
 * checkable program (prompts require one; POK-639).
 */
export function missingCompleteGo(results) {
  const go = results.filter((r) => r.lang === "go");
  return go.length > 0 && go.every((r) => r.status === "skip");
}

/** Markdown report for code-check.md / code-check-failed.md. */
export function buildCheckReport(slug, { results, counts }) {
  const icon = { pass: "✅ pass", warn: "⚠️ warn", fail: "❌ fail", skip: "⏭ skip" };
  const rows = results.map(
    (r) => `| ${r.index} | ${r.line} | \`${r.lang}\` | ${icon[r.status]} | ${r.detail.split("\n")[0].replace(/\|/g, "\\|")} |`
  );
  const failures = results
    .filter((r) => r.status === "fail")
    .map((r) => `### Block ${r.index} (line ${r.line}, \`${r.lang}\`)\n\n\`\`\`text\n${r.detail}\n\`\`\``);

  return `# Code check: ${slug}

Generated by the \`check\` step (\`draftsmith run\`). Blocks are compiled or parsed only; nothing is executed.

**${counts.pass} passed · ${counts.warn} warnings · ${counts.fail} failed · ${counts.skip} skipped** (warnings and skipped blocks still need a human look)
${counts.skip && !counts.pass && !counts.warn && !counts.fail ? "\n> ⚠️ **Nothing here could be checked automatically** (fragments or unsupported languages). Review every code block by hand.\n" : ""}${missingCompleteGo(results) ? "\n> ⚠️ **No complete Go program.** Every `go` block is a fragment; add the full `main.go` (package, imports, `func main`) so readers can run it and the check can compile it.\n" : ""}
| # | Line | Lang | Result | Detail |
|---|------|------|--------|--------|
${rows.join("\n") || "| – | – | – | – | no code blocks |"}
${failures.length ? `\n## Failures\n\n${failures.join("\n\n")}\n` : ""}`;
}
