/**
 * Article manifest schema — parse, validate, and build (POK-420).
 * Contract for link-to-article router and drafting prompts.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

export const VALID_CHANNELS = ["medium", "tommarler", "x"];
export const VALID_LINK_TYPES = ["article", "docs", "blog", "github", "youtube"];
export const VALID_STATUSES = ["draft", "review", "exported", "published"];

const CHANNEL_SET = new Set(VALID_CHANNELS);
const LINK_TYPE_SET = new Set(VALID_LINK_TYPES);
const STATUS_SET = new Set(VALID_STATUSES);
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function stripInlineComment(value) {
  const idx = value.search(/\s+#/);
  return (idx === -1 ? value : value.slice(0, idx)).trim();
}

function parseScalar(raw) {
  const value = stripInlineComment(raw);
  if (value === "null" || value === "") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Parse Draftsmith article manifest.yaml (flat + one nested `published` block).
 */
export function parseManifest(text) {
  const result = { published: {} };
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) {
      i++;
      continue;
    }

    const topMatch = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!topMatch) {
      i++;
      continue;
    }

    const key = topMatch[1];
    const rest = stripInlineComment(topMatch[2]);

    if (rest === "" && lines[i + 1]?.trim().startsWith("- ")) {
      const list = [];
      i++;
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        list.push(parseScalar(lines[i].trim().slice(2)));
        i++;
      }
      result[key] = list;
      continue;
    }

    if (rest === "" && key === "published") {
      i++;
      while (i < lines.length && /^\s{2}[a-z_]+:/i.test(lines[i])) {
        const nested = lines[i].match(/^\s{2}([a-z_]+):\s*(.*)$/i);
        if (nested) {
          result.published[nested[1]] = parseScalar(nested[2]);
        }
        i++;
      }
      continue;
    }

    result[key] = parseScalar(rest);
    i++;
  }

  return result;
}

function isNullish(value) {
  return value == null || value === "null" || value === "";
}

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a parsed manifest object.
 * Returns { ok, errors[], warnings[] }
 */
export function validateManifest(manifest, slug, { draftDir = null } = {}) {
  const errors = [];
  const warnings = [];
  const cwd = draftDir ?? join(process.cwd(), "articles", "drafts", slug);

  if (!manifest.slug) {
    errors.push("slug: required");
  } else if (manifest.slug !== slug) {
    errors.push(`slug: manifest has "${manifest.slug}", expected "${slug}"`);
  } else if (!SLUG_PATTERN.test(manifest.slug)) {
    errors.push(`slug: must be kebab-case (got "${manifest.slug}")`);
  }

  if (!manifest.title || isNullish(manifest.title)) {
    errors.push("title: required");
  }

  const channels = manifest.channels ?? [];
  if (!Array.isArray(channels) || channels.length === 0) {
    errors.push("channels: at least one channel required");
  } else {
    for (const channel of channels) {
      if (!CHANNEL_SET.has(channel)) {
        errors.push(`channels: invalid "${channel}" (allowed: ${VALID_CHANNELS.join(", ")})`);
      }
    }
  }

  if (!isNullish(manifest.link_type) && !LINK_TYPE_SET.has(manifest.link_type)) {
    errors.push(`link_type: invalid "${manifest.link_type}" (allowed: ${VALID_LINK_TYPES.join(", ")})`);
  }

  const hasSourceUrl = !isNullish(manifest.source_url);
  if (hasSourceUrl) {
    if (!isValidUrl(manifest.source_url)) {
      errors.push(`source_url: invalid URL "${manifest.source_url}"`);
    }
    if (isNullish(manifest.link_type)) {
      errors.push("link_type: required when source_url is set");
    }
  }

  if (!isNullish(manifest.canonical_url) && !isValidUrl(manifest.canonical_url)) {
    errors.push(`canonical_url: invalid URL "${manifest.canonical_url}"`);
  }

  const hasSeries = !isNullish(manifest.series);
  const hasPart = !isNullish(manifest.part);

  if (hasSeries && !hasPart) {
    errors.push("part: required when series is set");
  }
  if (hasPart && !hasSeries) {
    errors.push("series: required when part is set");
  }
  if (hasPart && typeof manifest.part !== "number") {
    errors.push(`part: must be a number (got "${manifest.part}")`);
  }

  if (!manifest.status || !STATUS_SET.has(manifest.status)) {
    errors.push(
      `status: invalid "${manifest.status ?? ""}" (allowed: ${VALID_STATUSES.join(", ")})`
    );
  }

  const published = manifest.published ?? {};
  for (const channel of VALID_CHANNELS) {
    const url = published[channel];
    if (!isNullish(url) && !isValidUrl(url)) {
      errors.push(`published.${channel}: invalid URL "${url}"`);
    }
  }

  if (manifest.status === "published") {
    const channelUrls = channels
      .map((c) => published[c])
      .filter((url) => !isNullish(url));
    if (channelUrls.length === 0) {
      errors.push("published: at least one channel URL required when status is published");
    }
  }

  if (hasSourceUrl) {
    const sourcePath = join(cwd, "source-material.md");
    if (!existsSync(sourcePath)) {
      warnings.push("source-material.md missing (expected for link-to-article drafts)");
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function validateChannels(channels) {
  const errors = [];
  if (!Array.isArray(channels) || channels.length === 0) {
    errors.push("channels: at least one channel required");
    return errors;
  }
  for (const channel of channels) {
    if (!CHANNEL_SET.has(channel)) {
      errors.push(`channels: invalid "${channel}" (allowed: ${VALID_CHANNELS.join(", ")})`);
    }
  }
  return errors;
}

function yamlQuote(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

/**
 * Build manifest YAML string for link-to-article scaffolding.
 */
export function buildManifestYaml({
  slug,
  title,
  channels,
  sourceUrl,
  linkType,
  angle = null,
  series = null,
  part = null,
}) {
  const channelErrors = validateChannels(channels);
  if (channelErrors.length) {
    throw new Error(channelErrors.join("; "));
  }
  if (!LINK_TYPE_SET.has(linkType)) {
    throw new Error(`link_type: invalid "${linkType}"`);
  }
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(`slug: must be kebab-case (got "${slug}")`);
  }

  const channelLines = channels.map((c) => `  - ${c}`).join("\n");
  const seriesLine = series ?? "null";
  const partLine = part ?? "null";
  const angleLine = angle ? yamlQuote(angle) : "null";

  return `slug: ${slug}
title: ${yamlQuote(title)}
source_url: ${sourceUrl}
link_type: ${linkType}
angle: ${angleLine}
channels:
${channelLines}
canonical_url: null
series: ${seriesLine}
part: ${partLine}
status: draft
published:
  medium: null
  tommarler: null
  x: null
`;
}
