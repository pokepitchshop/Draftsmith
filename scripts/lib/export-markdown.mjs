/**
 * Deterministic export transforms (POK-636).
 *
 * Exports are mechanical rewrites of draft-v2.md, so they run in code instead
 * of through a model:
 *   - leading YAML frontmatter removed
 *   - `[Screenshot: …]` lines → `<!-- image: … -->`
 *   - `## Draft notes` sections removed (up to the next heading of the same or higher level)
 * Everything inside fenced code blocks is left untouched.
 */

const FENCE = /^\s*(`{3,}|~{3,})/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const SCREENSHOT = /^\s*\[Screenshot:\s*(.+?)\]\s*$/i;

function stripFrontmatter(text) {
  if (!text.startsWith("---\n")) return text;
  const end = text.indexOf("\n---\n", 4);
  return end === -1 ? text : text.slice(end + 5);
}

/**
 * Build the shared export body (Medium as-is; tommarler adds frontmatter).
 */
export function buildExportBody(markdown) {
  const lines = stripFrontmatter(markdown.replace(/\r\n/g, "\n")).split("\n");
  const out = [];
  let fence = null;
  let skipLevel = null;

  for (const line of lines) {
    const fenceMatch = line.match(FENCE);
    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null;
      if (skipLevel === null) out.push(line);
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      const level = heading[1].length;
      if (skipLevel !== null && level <= skipLevel) skipLevel = null;
      if (skipLevel === null && /draft notes/i.test(heading[2])) {
        skipLevel = level;
        continue;
      }
    }

    if (skipLevel !== null) {
      if (fenceMatch) fence = fenceMatch[1];
      continue;
    }

    if (fenceMatch) {
      fence = fenceMatch[1];
      out.push(line);
      continue;
    }

    const shot = line.match(SCREENSHOT);
    out.push(shot ? `<!-- image: ${shot[1]} -->` : line);
  }

  return `${out.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

function yamlString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * tommarler.com export: frontmatter per templates/export-tommarler.md + shared body.
 */
export function buildTommarlerExport({ title, description, tags, publishedAt, body }) {
  return `---
title: ${yamlString(title)}
description: ${yamlString(description)}
publishedAt: ${yamlString(publishedAt)}
tags: [${tags.join(", ")}]
---

${body}`;
}

/**
 * Parse the model's `{ "description": "...", "tags": [...] }` reply.
 * Tags are normalized to lowercase kebab-case; 2–6 are required.
 */
export function parseFrontmatterReply(text) {
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error("model reply has no JSON object");

  let data;
  try {
    data = JSON.parse(json);
  } catch (error) {
    throw new Error(`model reply is not valid JSON (${error.message})`);
  }

  const description = typeof data.description === "string" ? data.description.trim() : "";
  if (!description) throw new Error("model reply missing description");

  const tags = (Array.isArray(data.tags) ? data.tags : [])
    .map((t) => String(t).toLowerCase().trim().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, ""))
    .filter(Boolean)
    .filter((t, i, all) => all.indexOf(t) === i);
  if (tags.length < 2 || tags.length > 6) {
    throw new Error(`model reply needs 2–6 tags (got ${tags.length})`);
  }

  return { description, tags };
}
