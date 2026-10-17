/**
 * Draftsmith runtime config (POK-635).
 *
 * Precedence (highest first): CLI flags > env vars > draftsmith.config.json > defaults.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_CONFIG = {
  defaultProvider: "agent",
  ollama: {
    host: "http://localhost:11434",
    model: "qwen3:8b",
    num_ctx: 16384,
    temperature: 0.6,
  },
  steps: {},
};

export function loadConfig(rootDir = process.cwd(), env = process.env) {
  const path = join(rootDir, "draftsmith.config.json");
  let file = {};
  if (existsSync(path)) {
    try {
      file = JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
      throw new Error(`draftsmith.config.json: ${error.message}`);
    }
  }

  const config = {
    defaultProvider: file.defaultProvider ?? DEFAULT_CONFIG.defaultProvider,
    ollama: { ...DEFAULT_CONFIG.ollama, ...file.ollama },
    steps: { ...DEFAULT_CONFIG.steps, ...file.steps },
  };

  if (env.OLLAMA_HOST) config.ollama.host = normalizeHost(env.OLLAMA_HOST);
  if (env.DRAFTSMITH_MODEL) config.ollama.model = env.DRAFTSMITH_MODEL;

  return config;
}

/**
 * OLLAMA_HOST is often set as `0.0.0.0:11434` or `nas.local:11434` for the
 * server; accept those forms on the client side too.
 */
export function normalizeHost(host) {
  const withScheme = /^https?:\/\//.test(host) ? host : `http://${host}`;
  return withScheme.replace("://0.0.0.0", "://localhost");
}

/**
 * Resolve provider + Ollama settings for one step.
 * `overrides` come from CLI flags and win over everything.
 */
export function resolveStepSettings(config, stepId, overrides = {}) {
  const stepConfig = config.steps[stepId] ?? {};
  return {
    provider: overrides.provider ?? stepConfig.provider ?? config.defaultProvider,
    ollama: {
      ...config.ollama,
      ...(stepConfig.model ? { model: stepConfig.model } : {}),
      ...(stepConfig.num_ctx ? { num_ctx: stepConfig.num_ctx } : {}),
      ...(overrides.model ? { model: overrides.model } : {}),
    },
  };
}
