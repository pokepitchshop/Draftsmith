/**
 * Ingest YouTube URLs via youtube-transcript-api (Python).
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseYouTubeVideoId } from "./detect-link-type.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function ingestYouTube(rawUrl) {
  const url = new URL(rawUrl);
  const videoId = parseYouTubeVideoId(url);
  const scriptPath = join(__dirname, "..", "ingest_youtube.py");

  const result = spawnSync("python3", [scriptPath, videoId, rawUrl], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.status !== 0) {
    const message =
      result.stderr?.trim() ||
      result.stdout?.trim() ||
      "youtube-transcript-api failed — run: pip install -r scripts/requirements-ingest.txt";
    throw new Error(message);
  }

  const payload = JSON.parse(result.stdout);
  return {
    title: payload.title || `YouTube ${videoId}`,
    markdown: payload.markdown,
    engine: "youtube-transcript-api",
  };
}
