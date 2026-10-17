/**
 * Pipeline step registry + runner (POK-634, POK-635).
 *
 * Single source of truth for which steps run, what each step reads, where it
 * writes, and which manifest status it sets. Providers decide *how* a step
 * runs:
 *   - agent:  hand the prompt to a chat agent (Cursor, etc.) and stop
 *   - ollama: assemble prompt + inputs, call a local Ollama server, write outputs
 * Steps with a `builtin` run in code instead (POK-636); a builtin may return
 * null to fall through to the provider.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { parseManifest, VALID_STATUSES } from "./manifest-schema.mjs";
import { loadConfig, resolveStepSettings } from "./config.mjs";
import { ollamaChat, estimateTokens, cleanModelOutput } from "./ollama.mjs";
import { buildExportBody, buildTommarlerExport, parseFrontmatterReply } from "./export-markdown.mjs";

const draftPath = (slug, file) => `articles/drafts/${slug}/${file}`;

/** Tokens held back for the model's reply when checking num_ctx. */
const OUTPUT_TOKEN_RESERVE = 4096;

/** Lowercase alphanumerics only, so link/format changes don't count as edits. */
const normalizeProse = (text) =>
  text
    // [https://x](https://x) → https://x, so linkifying a bare URL isn't an edit
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, label, url) => (label.trim() === url.trim() ? url : m))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * Exports should carry the draft's prose over unchanged (screenshot markers and
 * draft notes aside). Returns an error listing source paragraphs missing from
 * the output, or null.
 */
export function checkParagraphsPreserved(sourceText, outputText) {
  const output = normalizeProse(outputText);
  const missing = [];
  let inDraftNotes = false;

  for (const block of sourceText.split(/\n\s*\n/)) {
    const text = block.trim();
    if (!text) continue;
    if (/^#+\s/.test(text)) inDraftNotes = /draft notes/i.test(text);
    if (inDraftNotes || /^\[Screenshot/i.test(text)) continue;

    const norm = normalizeProse(text);
    if (norm && !output.includes(norm)) missing.push(text);
  }

  if (!missing.length) return null;
  const preview = missing
    .slice(0, 3)
    .map((p) => `  - "${p.replace(/\s+/g, " ").slice(0, 90)}${p.length > 90 ? "…" : ""}"`)
    .join("\n");
  return `${missing.length} paragraph(s) from draft-v2.md missing or altered in the export:\n${preview}`;
}

const preservesDraft = (slug, rootDir, outputPath) =>
  checkParagraphsPreserved(
    readFileSync(join(rootDir, draftPath(slug, "draft-v2.md")), "utf8"),
    readFileSync(join(rootDir, outputPath), "utf8")
  );

export const STEPS = [
  {
    id: "draft",
    prompt: "prompts/07-draft-from-link.md",
    inputs: (slug) => [
      draftPath(slug, "manifest.yaml"),
      draftPath(slug, "source-material.md"),
      "style/iostom-style-guide.md",
      "templates/article-template.md",
    ],
    output: (slug) => draftPath(slug, "draft.md"),
    // Outline-first drafts can skip draft.md and land directly on draft-v2.md.
    alsoDoneWhen: (slug) => [draftPath(slug, "draft-v2.md")],
    setsStatus: "draft",
  },
  {
    id: "self-edit",
    prompt: "prompts/03-self-edit.md",
    inputs: (slug, manifest) => [
      draftPath(slug, "draft.md"),
      "style/iostom-style-guide.md",
      draftPath(slug, "manifest.yaml"),
      ...(manifest.series ? [`series/${manifest.series}/manifest.yaml`] : []),
    ],
    output: (slug) => draftPath(slug, "draft-v2.md"),
    setsStatus: "review",
  },
  {
    id: "export-medium",
    channel: "medium",
    prompt: "prompts/04-export-medium.md",
    inputs: (slug) => [
      draftPath(slug, "draft-v2.md"),
      draftPath(slug, "manifest.yaml"),
      "templates/export-medium.md",
    ],
    output: (slug) => `export/medium/${slug}.md`,
    // Mechanical transform of draft-v2.md: no model, no handoff, any provider.
    builtin: (ctx) => exportMediumBuiltin(ctx),
    agentMessage: (slug) => `Run \`node scripts/draftsmith.mjs run ${slug}\` — the Medium export is built in code.`,
    check: (slug, rootDir) => preservesDraft(slug, rootDir, `export/medium/${slug}.md`),
    setsStatus: "exported",
  },
  {
    id: "export-tommarler",
    channel: "tommarler",
    prompt: "prompts/05-export-tommarler.md",
    inputs: (slug) => [
      draftPath(slug, "draft-v2.md"),
      draftPath(slug, "manifest.yaml"),
      "templates/export-tommarler.md",
    ],
    output: (slug) => `export/tommarler/${slug}.md`,
    // Body in code; with ollama the model only writes description + tags. Agent hands off as before.
    builtin: (ctx) => (ctx.settings.provider === "ollama" ? exportTommarlerBuiltin(ctx) : null),
    check: (slug, rootDir) => preservesDraft(slug, rootDir, `export/tommarler/${slug}.md`),
    setsStatus: "exported",
  },
  {
    id: "export-x",
    channel: "x",
    prompt: "prompts/06-export-x.md",
    inputs: (slug) => [
      draftPath(slug, "draft-v2.md"),
      draftPath(slug, "manifest.yaml"),
      "style/x-social-guide.md",
      "templates/export-x-thread.md",
      "templates/export-x-single.md",
    ],
    output: (slug) => `export/x/${slug}/thread.md`,
    extraOutputs: (slug) => [`export/x/${slug}/single.md`],
    requires: (manifest) =>
      manifest.canonical_url
        ? null
        : "canonical_url is null — publish long-form first, set canonical_url in the manifest, then re-run",
    validate: (slug) => ["scripts/validate-x-export.mjs", slug],
    setsStatus: "exported",
  },
];

export const STEP_IDS = STEPS.map((s) => s.id);

/**
 * Ordered steps for an article: core steps, then exports in manifest channel order.
 */
export function planSteps(channels = []) {
  const core = STEPS.filter((s) => !s.channel);
  const exports = channels
    .map((c) => STEPS.find((s) => s.channel === c))
    .filter(Boolean);
  return [...core, ...exports];
}

export function agentMessage(step, slug) {
  return step.agentMessage?.(slug) ?? `Follow \`${step.prompt}\` for slug \`${slug}\`.`;
}

export function stepOutputs(step, slug) {
  return [step.output(slug), ...(step.extraOutputs?.(slug) ?? [])];
}

export function isStepDone(step, slug, rootDir = process.cwd()) {
  const paths = [step.output(slug), ...(step.alsoDoneWhen?.(slug) ?? [])];
  return paths.some((p) => existsSync(join(rootDir, p)));
}

function readManifest(slug, rootDir) {
  const manifestPath = join(rootDir, draftPath(slug, "manifest.yaml"));
  if (!existsSync(manifestPath)) return null;
  return parseManifest(readFileSync(manifestPath, "utf8"));
}

/**
 * Resolve plan + done state for a slug. Returns null when no manifest exists.
 */
export function resolvePipeline(slug, rootDir = process.cwd()) {
  const manifest = readManifest(slug, rootDir);
  if (!manifest) return null;

  const steps = planSteps(manifest.channels ?? []).map((step) => ({
    step,
    done: isStepDone(step, slug, rootDir),
  }));
  const next = steps.find((s) => !s.done)?.step ?? null;

  return { slug, manifest, steps, next };
}

/**
 * Advance manifest status; never moves it backwards (e.g. published → exported).
 */
export function advanceManifestStatus(slug, status, rootDir = process.cwd()) {
  const manifestPath = join(rootDir, draftPath(slug, "manifest.yaml"));
  const text = readFileSync(manifestPath, "utf8");
  const current = parseManifest(text).status;
  if (VALID_STATUSES.indexOf(current) >= VALID_STATUSES.indexOf(status)) return false;
  writeFileSync(manifestPath, text.replace(/^status:.*$/m, `status: ${status}`), "utf8");
  return true;
}

/**
 * Build the chat messages for a step. The model never touches the filesystem:
 * every input is inlined and the reply is written by the runner.
 */
export function buildStepMessages(step, slug, manifest, rootDir = process.cwd()) {
  const prompt = readFileSync(join(rootDir, step.prompt), "utf8").replaceAll("{slug}", slug);

  const files = step.inputs(slug, manifest).map((path) => {
    const full = join(rootDir, path);
    if (!existsSync(full)) {
      throw new Error(`${step.id}: missing input ${path}`);
    }
    return { path, content: readFileSync(full, "utf8") };
  });

  const outputs = stepOutputs(step, slug);
  const outputRule =
    outputs.length === 1
      ? `- Your reply is saved verbatim as \`${outputs[0]}\`. Reply with only that file's contents: no preamble, no explanation, no surrounding code fence.`
      : `- Your reply is split into these files: ${outputs.map((o) => `\`${o}\``).join(", ")}. Start each file with a line that is exactly \`<<<FILE: path>>>\` followed by its contents. No other text.`;

  const system = `You are Draftsmith, drafting technical content in iostom's voice. You run inside an automated pipeline:
- You cannot read or write files or run commands. Every file the task refers to is included in the user message inside <file> tags.
- Ignore instructions to update the manifest, run validation scripts, or ask the user a question; the pipeline handles those.
${outputRule}`;

  const fileBlocks = files
    .map((f) => `## ${f.path}\n\n<file path="${f.path}">\n${f.content}\n</file>`)
    .join("\n\n");

  const user = `# Task (slug: ${slug})\n\n${prompt}\n\n# Files\n\n${fileBlocks}`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/**
 * Split a multi-file reply on `<<<FILE: path>>>` markers.
 */
export function splitOutputs(text, expected) {
  if (expected.length === 1) return { [expected[0]]: text };

  const parts = {};
  const re = /^<<<FILE:\s*(.+?)\s*>>>\s*$/gm;
  const marks = [...text.matchAll(re)];
  marks.forEach((m, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].index : text.length;
    parts[m[1].replace(/`/g, "")] = text.slice(m.index + m[0].length, end);
  });

  const missing = expected.filter((p) => !parts[p]?.trim());
  if (missing.length) {
    throw new Error(`model reply missing file section(s): ${missing.join(", ")}`);
  }
  return parts;
}

/**
 * Call Ollama after checking the prompt fits num_ctx (Ollama truncates silently).
 */
async function guardedChat(step, messages, settings, onEvent, { format = null } = {}) {
  const { host, model, num_ctx, temperature } = settings.ollama;
  const promptTokens = estimateTokens(messages.map((m) => m.content).join("\n"));
  if (promptTokens + OUTPUT_TOKEN_RESERVE > num_ctx) {
    throw new Error(
      `${step.id}: prompt is ~${promptTokens} tokens + ${OUTPUT_TOKEN_RESERVE} reserved for output, over num_ctx ${num_ctx}. ` +
        `Raise ollama.num_ctx in draftsmith.config.json (uses more VRAM) or trim the inputs.`
    );
  }

  onEvent?.({ type: "start", step: step.id, model, host, promptTokens });
  const reply = await ollamaChat({
    host,
    model,
    messages,
    format,
    options: { num_ctx, temperature },
    onProgress: (chars) => onEvent?.({ type: "progress", step: step.id, chars }),
  });
  onEvent?.({ type: "done", step: step.id, stats: reply.stats });
  return reply;
}

function writeOutput(rootDir, path, content) {
  const full = join(rootDir, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, "utf8");
}

function readDraftBody(slug, rootDir) {
  return buildExportBody(readFileSync(join(rootDir, draftPath(slug, "draft-v2.md")), "utf8"));
}

async function exportMediumBuiltin({ step, slug, rootDir }) {
  writeOutput(rootDir, step.output(slug), readDraftBody(slug, rootDir));
  return { handoff: false, provider: "builtin", written: [step.output(slug)] };
}

async function exportTommarlerBuiltin({ step, slug, rootDir, manifest, settings, onEvent }) {
  const body = readDraftBody(slug, rootDir);
  const messages = [
    {
      role: "system",
      content: `You write frontmatter for a tommarler.com blog post. Reply with only a JSON object: {"description": "...", "tags": ["..."]}.
- description: 1–2 plain-text sentences for the SEO meta description, under 160 characters, saying what the reader builds or learns.
- tags: 2–6 lowercase topic tags, kebab-case (example: ["go", "gorilla-mux", "http", "tutorials"]).`,
    },
    { role: "user", content: `Title: ${manifest.title}\n\n<article>\n${body}</article>` },
  ];

  const { content, stats } = await guardedChat(step, messages, settings, onEvent, { format: "json" });
  const { description, tags } = parseFrontmatterReply(content);
  if (description.length > 300) throw new Error(`${step.id}: description is ${description.length} chars (max 300)`);

  writeOutput(
    rootDir,
    step.output(slug),
    buildTommarlerExport({
      title: manifest.title,
      description,
      tags,
      publishedAt: new Date().toLocaleDateString("en-CA"),
      body,
    })
  );
  return { handoff: false, provider: "builtin+ollama", written: [step.output(slug)], stats };
}

export const PROVIDERS = {
  /**
   * Hand the step to a chat agent (Cursor, etc.) and stop. The agent reads
   * the prompt file and writes the output itself.
   */
  agent: {
    stopsAfterHandoff: true,
    async run(step, slug) {
      return { handoff: true, message: agentMessage(step, slug) };
    },
  },

  /**
   * Run the step on a local Ollama server and write the output file(s).
   */
  ollama: {
    stopsAfterHandoff: false,
    async run(step, slug, { rootDir, manifest, settings, onEvent }) {
      const messages = buildStepMessages(step, slug, manifest, rootDir);
      const { content, stats } = await guardedChat(step, messages, settings, onEvent);

      const outputs = stepOutputs(step, slug);
      const parts = splitOutputs(content, outputs);
      for (const path of outputs) {
        const body = cleanModelOutput(parts[path]);
        if (!body.trim()) throw new Error(`${step.id}: model returned empty content for ${path}`);
        writeOutput(rootDir, path, body);
      }

      return { handoff: false, written: outputs, stats };
    },
  },
};

/**
 * Post-step checks for provider-written output: in-process `check`, then the
 * `validate` script. Output is left on disk for inspection either way.
 */
function runValidator(step, slug, rootDir) {
  const retry = `Fix it, or delete ${step.output(slug)} and re-run.`;

  const checkError = step.check?.(slug, rootDir);
  if (checkError) return `${step.id}: check failed — ${checkError}\n${retry}`;

  if (!step.validate) return null;
  const result = spawnSync(process.execPath, step.validate(slug), { cwd: rootDir, encoding: "utf8" });
  if (result.status === 0) return null;
  return `${step.id}: validation failed\n${(result.stdout + result.stderr).trim()}\n${retry}`;
}

/**
 * Run pending steps for a slug until a handoff, a blocker, an error,
 * `until`, or completion.
 *
 * @param {object} opts
 * @param {string} [opts.provider]  force a provider for every step (CLI --provider)
 * @param {string} [opts.model]     force an Ollama model (CLI --model)
 * @param {string} [opts.until]     stop before running this step id
 * @param {object} [opts.config]    loaded config (default: loadConfig(rootDir))
 * @param {Function} [opts.onEvent] progress callback for long-running providers
 */
export async function runPipeline(
  slug,
  { provider = null, model = null, until = null, rootDir = process.cwd(), config = null, onEvent = null } = {}
) {
  if (provider && !PROVIDERS[provider]) {
    throw new Error(`provider: unknown "${provider}" (allowed: ${Object.keys(PROVIDERS).join(", ")})`);
  }
  if (until && !STEP_IDS.includes(until)) {
    throw new Error(`until: unknown step "${until}" (allowed: ${STEP_IDS.join(", ")})`);
  }

  const pipeline = resolvePipeline(slug, rootDir);
  if (!pipeline) {
    throw new Error(`No draft found for slug "${slug}"`);
  }

  const cfg = config ?? loadConfig(rootDir);
  const results = [];

  for (const { step, done } of pipeline.steps) {
    if (done) continue;
    if (step.id === until) break;

    const settings = resolveStepSettings(cfg, step.id, { provider, model });
    const impl = PROVIDERS[settings.provider];
    const base = { step: step.id, provider: settings.provider, prompt: step.prompt, output: step.output(slug) };

    if (!impl) {
      results.push({ ...base, error: `provider: unknown "${settings.provider}" in draftsmith.config.json` });
      break;
    }

    // Re-read so status/fields written by earlier steps are visible.
    const manifest = readManifest(slug, rootDir);
    const blocker = step.requires?.(manifest);
    if (blocker) {
      results.push({ ...base, blocked: true, reason: blocker });
      break;
    }

    let result;
    try {
      const ctx = { step, slug, rootDir, manifest, settings, onEvent };
      result = (await step.builtin?.(ctx)) ?? (await impl.run(step, slug, ctx));
    } catch (error) {
      results.push({ ...base, error: error.message });
      break;
    }

    if (result.handoff) {
      results.push({ ...base, ...result });
      if (impl.stopsAfterHandoff) break;
      continue;
    }

    const validationError = runValidator(step, slug, rootDir);
    if (validationError) {
      results.push({ ...base, ...result, error: validationError });
      break;
    }

    const statusChanged = advanceManifestStatus(slug, step.setsStatus, rootDir);
    results.push({ ...base, ...result, status: statusChanged ? step.setsStatus : undefined });
  }

  const after = resolvePipeline(slug, rootDir);
  return { slug, results, complete: !after.next };
}
