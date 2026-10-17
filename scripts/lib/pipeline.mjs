/**
 * Pipeline step registry + runner (POK-634).
 *
 * Single source of truth for which steps run, what each step reads, where it
 * writes, and which manifest status it sets. Providers decide *how* a step
 * runs; Phase 1 ships only the `agent` provider (hand the prompt to a chat
 * agent and stop).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseManifest } from "./manifest-schema.mjs";

const draftPath = (slug, file) => `articles/drafts/${slug}/${file}`;

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
    inputs: (slug) => [
      draftPath(slug, "draft.md"),
      "style/iostom-style-guide.md",
      draftPath(slug, "manifest.yaml"),
    ],
    output: (slug) => draftPath(slug, "draft-v2.md"),
    setsStatus: "review",
  },
  {
    id: "export-medium",
    channel: "medium",
    prompt: "prompts/04-export-medium.md",
    inputs: (slug) => [draftPath(slug, "draft-v2.md"), draftPath(slug, "manifest.yaml")],
    output: (slug) => `export/medium/${slug}.md`,
    setsStatus: "exported",
  },
  {
    id: "export-tommarler",
    channel: "tommarler",
    prompt: "prompts/05-export-tommarler.md",
    inputs: (slug) => [draftPath(slug, "draft-v2.md"), draftPath(slug, "manifest.yaml")],
    output: (slug) => `export/tommarler/${slug}.md`,
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
    ],
    output: (slug) => `export/x/${slug}/thread.md`,
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
  return `Follow \`${step.prompt}\` for slug \`${slug}\`.`;
}

export function isStepDone(step, slug, rootDir = process.cwd()) {
  const paths = [step.output(slug), ...(step.alsoDoneWhen?.(slug) ?? [])];
  return paths.some((p) => existsSync(join(rootDir, p)));
}

/**
 * Resolve plan + done state for a slug. Returns null when no manifest exists.
 */
export function resolvePipeline(slug, rootDir = process.cwd()) {
  const manifestPath = join(rootDir, draftPath(slug, "manifest.yaml"));
  if (!existsSync(manifestPath)) return null;

  const manifest = parseManifest(readFileSync(manifestPath, "utf8"));
  const steps = planSteps(manifest.channels ?? []).map((step) => ({
    step,
    done: isStepDone(step, slug, rootDir),
  }));
  const next = steps.find((s) => !s.done)?.step ?? null;

  return { slug, manifest, steps, next };
}

export const PROVIDERS = {
  /**
   * Hand the step to a chat agent (Cursor, etc.) and stop. The agent reads
   * the prompt file and writes the output itself.
   */
  agent: {
    stopsAfterHandoff: true,
    run(step, slug) {
      return { handoff: true, message: agentMessage(step, slug) };
    },
  },
};

/**
 * Run the next pending step(s) for a slug.
 *
 * @param {object} opts
 * @param {string} opts.provider  provider name (default: agent)
 * @param {string} [opts.until]   stop before running this step id
 */
export function runPipeline(slug, { provider = "agent", until = null, rootDir = process.cwd() } = {}) {
  const impl = PROVIDERS[provider];
  if (!impl) {
    throw new Error(`provider: unknown "${provider}" (allowed: ${Object.keys(PROVIDERS).join(", ")})`);
  }
  if (until && !STEP_IDS.includes(until)) {
    throw new Error(`until: unknown step "${until}" (allowed: ${STEP_IDS.join(", ")})`);
  }

  const pipeline = resolvePipeline(slug, rootDir);
  if (!pipeline) {
    throw new Error(`No draft found for slug "${slug}"`);
  }

  const results = [];
  for (const { step, done } of pipeline.steps) {
    if (done) continue;
    if (step.id === until) break;

    const result = impl.run(step, slug, { rootDir, manifest: pipeline.manifest });
    results.push({ step: step.id, prompt: step.prompt, output: step.output(slug), ...result });
    if (impl.stopsAfterHandoff && result.handoff) break;
  }

  return { slug, provider, results, complete: !pipeline.next };
}
