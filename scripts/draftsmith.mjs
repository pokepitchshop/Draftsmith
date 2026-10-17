#!/usr/bin/env node
/**
 * Draftsmith CLI — drop a link front door (POK-426).
 *
 * Usage:
 *   node scripts/draftsmith.mjs new <url> [options]
 *   node scripts/draftsmith.mjs status <slug>
 *   node scripts/draftsmith.mjs run <slug> [--provider agent|ollama] [--model <name>] [--until <step>] [--json]
 *
 * Options (new):
 *   --slug <slug>         kebab-case slug (auto-derived from URL if omitted)
 *   --title <title>       Article title (default: from ingestion)
 *   --channels <list>     Comma-separated: medium,tommarler,x (default: medium)
 *   --angle <text>        Optional drafting angle
 *   --series <slug>       Series slug
 *   --part <n>            Part number
 *   --engine <engine>     jina | trafilatura | auto (default: auto)
 *   --json                Print machine-readable summary
 *
 * Example:
 *   node scripts/draftsmith.mjs new https://cursor.com/docs/rules \
 *     --channels medium \
 *     --angle "Set up .cursor/rules on a real repo"
 */

import { scaffoldLinkDraft, getPipelineStatus } from "./lib/link-draft.mjs";
import { runPipeline } from "./lib/pipeline.mjs";

function parseNewArgs(argv) {
  const result = {
    url: null,
    slug: null,
    title: null,
    channels: ["medium"],
    angle: null,
    series: null,
    part: null,
    engine: "auto",
    json: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--slug") result.slug = argv[++i];
    else if (arg === "--title") result.title = argv[++i];
    else if (arg === "--channels") result.channels = argv[++i].split(",").map((c) => c.trim());
    else if (arg === "--angle") result.angle = argv[++i];
    else if (arg === "--series") result.series = argv[++i];
    else if (arg === "--part") result.part = Number(argv[++i]);
    else if (arg === "--engine") result.engine = argv[++i];
    else if (arg === "--json") result.json = true;
    else if (!arg.startsWith("-") && !result.url) result.url = arg;
  }

  if (!result.url) {
    console.error(`Usage: node scripts/draftsmith.mjs new <url> [options]`);
    console.error(`       node scripts/draftsmith.mjs status <slug>`);
    process.exit(1);
  }

  return result;
}

async function cmdNew(argv) {
  const args = parseNewArgs(argv);

  try {
    const result = await scaffoldLinkDraft(args);

    if (args.json) {
      console.log(
        JSON.stringify(
          {
            slug: result.slug,
            draft_dir: result.draftDir,
            manifest: result.manifestPath,
            source_material: result.sourceMaterialPath,
            handoff: result.handoffPath,
            link_type: result.linkType,
            title: result.title,
            channels: result.channels,
            cursor_prompts: result.cursorPrompts,
          },
          null,
          2
        )
      );
      return;
    }

    console.log(`\nDrop-link complete: ${result.slug}\n`);
    console.log(`  ${result.draftDir}/`);
    console.log(`    manifest.yaml`);
    console.log(`    source-material.md  (${result.linkType}, ${result.sourceLength} chars)`);
    console.log(`    handoff.md`);
    console.log(`\nNext — paste into Cursor chat:\n`);
    console.log(`  ${result.cursorPrompts[0].message}`);
    console.log(`\nFull pipeline: open handoff.md or see docs/drop-link.md`);
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exit(1);
  }
}

function cmdStatus(slug) {
  if (!slug) {
    console.error("Usage: node scripts/draftsmith.mjs status <slug>");
    process.exit(1);
  }

  const status = getPipelineStatus(slug);
  if (!status.exists) {
    console.error(`No draft found for slug "${slug}"`);
    process.exit(1);
  }

  console.log(`Pipeline status: ${slug}\n`);
  console.log(`  manifest:         ${status.files.manifest ? "yes" : "no"}`);
  console.log(`  source-material:  ${status.files.sourceMaterial ? "yes" : "no"}`);
  console.log(`  handoff:          ${status.files.handoff ? "yes" : "no"}`);
  console.log(`  draft.md:         ${status.files.draft ? "yes" : "no"}`);
  console.log(`  draft-v2.md:      ${status.files.draftV2 ? "yes" : "no"}`);

  for (const [channel, done] of Object.entries(status.exports)) {
    console.log(`  export/${channel}:  ${done ? "yes" : "no"}`);
  }

  console.log(`\n  manifest status: ${status.manifest.status ?? "unknown"}`);

  if (status.nextStep) {
    console.log(`\nNext — Cursor chat:\n  ${status.nextStep.message}`);
  } else {
    console.log(`\nPipeline files present. Follow docs/publish-checklist.md to publish.`);
  }
}

function printRunEvent(event) {
  if (event.type === "start") {
    process.stderr.write(`  ${event.step}: ${event.model} @ ${event.host} (~${event.promptTokens} prompt tokens)\n`);
  } else if (event.type === "progress") {
    // Live counter only on a terminal; piped/CI output gets just start + done.
    if (process.stderr.isTTY) process.stderr.write(`\r    ${event.chars} chars`);
  } else if (event.type === "done") {
    const secs = event.stats.seconds ? `, ${event.stats.seconds.toFixed(0)}s` : "";
    process.stderr.write(`${process.stderr.isTTY ? "\r" : ""}    done (${event.stats.outputTokens ?? "?"} tokens${secs})\n`);
  }
}

async function cmdRun(argv) {
  const opts = { slug: null, provider: null, model: null, until: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--provider") opts.provider = argv[++i];
    else if (arg === "--model") opts.model = argv[++i];
    else if (arg === "--until") opts.until = argv[++i];
    else if (arg === "--json") opts.json = true;
    else if (!arg.startsWith("-") && !opts.slug) opts.slug = arg;
  }

  if (!opts.slug) {
    console.error(
      "Usage: node scripts/draftsmith.mjs run <slug> [--provider agent|ollama] [--model <name>] [--until <step>] [--json]"
    );
    process.exit(1);
  }

  let result;
  try {
    result = await runPipeline(opts.slug, { ...opts, onEvent: opts.json ? null : printRunEvent });
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exit(1);
  }

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    if (result.results.some((r) => r.error)) process.exitCode = 1;
    return;
  }

  for (const r of result.results) {
    if (r.handoff) {
      console.log(`Next — Cursor chat:\n  ${r.message}\n\n  writes: ${r.output}`);
    } else if (r.blocked) {
      console.log(`Blocked at ${r.step}: ${r.reason}`);
    } else if (r.error) {
      console.error(`FAIL ${r.error}`);
      process.exitCode = 1;
    } else {
      const status = r.status ? ` (status → ${r.status})` : "";
      const summary = r.summary ? ` — ${r.summary}` : "";
      console.log(`Wrote ${r.written.join(", ")}${summary}${status}`);
    }
  }

  if (result.complete) {
    console.log(`Pipeline complete: ${opts.slug}. Review the drafts, then follow docs/publish-checklist.md.`);
  } else if (result.results.length === 0) {
    console.log(`Stopped before "${opts.until}" for ${opts.slug}.`);
  }
}

const [command, ...rest] = process.argv.slice(2);

if (command === "new") {
  await cmdNew(rest);
} else if (command === "status") {
  cmdStatus(rest[0]);
} else if (command === "run") {
  await cmdRun(rest);
} else {
  console.error(`Usage: node scripts/draftsmith.mjs new <url> [options]`);
  console.error(`       node scripts/draftsmith.mjs status <slug>`);
  console.error(`       node scripts/draftsmith.mjs run <slug> [--provider agent|ollama] [--model <name>] [--until <step>]`);
  process.exit(1);
}
