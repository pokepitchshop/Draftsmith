/**
 * Inbox job files for the NAS worker (POK-637).
 *
 * One file per article. First non-empty line is the URL; optional
 * `key: value` lines follow. Lines starting with # are comments.
 *
 *   https://github.com/gorilla/mux
 *   angle: Show path variables with mux.Vars
 *   channels: medium, tommarler
 */

import { validateChannels } from "./manifest-schema.mjs";
import { isValidSlug, slugFromUrl } from "./slug-from-url.mjs";

const KEYS = new Set(["slug", "title", "channels", "angle", "series", "part", "engine"]);
const ENGINES = new Set(["auto", "jina", "trafilatura"]);

export function parseJobFile(text) {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  if (!lines.length) throw new Error("job file is empty (first line must be the URL)");

  const url = lines[0];
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`first line is not a URL: "${url}"`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`URL must be http(s): "${url}"`);
  }

  const job = { url, slug: null, title: null, channels: ["medium"], angle: null, series: null, part: null, engine: "auto" };

  for (const line of lines.slice(1)) {
    const m = line.match(/^([a-z]+)\s*:\s*(.*)$/i);
    if (!m || !KEYS.has(m[1].toLowerCase())) {
      throw new Error(`unrecognized line: "${line}" (allowed keys: ${[...KEYS].join(", ")})`);
    }
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "channels") job.channels = value.split(",").map((c) => c.trim()).filter(Boolean);
    else if (key === "part") job.part = Number(value);
    else job[key] = value || null;
  }

  const channelErrors = validateChannels(job.channels);
  if (channelErrors.length) throw new Error(channelErrors.join("; "));
  if (job.slug && !isValidSlug(job.slug)) throw new Error(`slug: invalid kebab-case "${job.slug}"`);
  if (!ENGINES.has(job.engine)) throw new Error(`engine: must be one of ${[...ENGINES].join(", ")}`);
  if ((job.series == null) !== (job.part == null)) throw new Error("series and part must be set together");
  if (job.part != null && !Number.isInteger(job.part)) throw new Error(`part: must be a whole number`);

  job.slug ??= slugFromUrl(url);
  if (!isValidSlug(job.slug)) {
    throw new Error(`could not derive a slug from the URL ("${job.slug}"); add a "slug:" line`);
  }

  return job;
}

/** CLI args for `draftsmith new` from a parsed job. */
export function newCommandArgs(job) {
  const args = ["new", job.url, "--slug", job.slug, "--channels", job.channels.join(","), "--engine", job.engine, "--json"];
  if (job.title) args.push("--title", job.title);
  if (job.angle) args.push("--angle", job.angle);
  if (job.series) args.push("--series", job.series, "--part", String(job.part));
  return args;
}
