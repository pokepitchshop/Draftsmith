/**
 * Ingest article/docs/blog URLs via Jina Reader.
 * Fallback: optional trafilatura Python script when JINA fails.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const JINA_BASE = "https://r.jina.ai/";

function stripBoilerplate(markdown) {
  return markdown
    .replace(/^Title:\s*.+\n+/im, "")
    .replace(/^URL Source:\s*.+\n+/im, "")
    .replace(/^Markdown Content:\s*\n+/im, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTitle(markdown, fallback) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

async function fetchJina(url) {
  const jinaUrl = `${JINA_BASE}${url}`;
  const headers = {
    Accept: "text/markdown",
  };

  if (process.env.JINA_API_KEY) {
    headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;
  }

  const response = await fetch(jinaUrl, { headers });

  if (!response.ok) {
    throw new Error(`Jina Reader failed (${response.status}): ${response.statusText}`);
  }

  const markdown = stripBoilerplate(await response.text());
  if (!markdown || markdown.length < 80) {
    throw new Error("Jina Reader returned empty or very short content");
  }

  return {
    title: extractTitle(markdown, url),
    markdown,
    engine: "jina",
  };
}

function fetchTrafilatura(url) {
  const scriptPath = join(__dirname, "..", "ingest_article.py");
  const result = spawnSync("python3", [scriptPath, url], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.status !== 0) {
    const message = result.stderr?.trim() || result.stdout?.trim() || "trafilatura failed";
    throw new Error(message);
  }

  const payload = JSON.parse(result.stdout);
  return {
    title: payload.title || url,
    markdown: payload.markdown,
    engine: "trafilatura",
  };
}

export async function ingestArticleLike(url, linkType, { engine = "auto" } = {}) {
  if (engine === "trafilatura") {
    return fetchTrafilatura(url);
  }

  try {
    return await fetchJina(url);
  } catch (jinaError) {
    if (engine === "jina") throw jinaError;

    try {
      const fallback = fetchTrafilatura(url);
      fallback.engine = `trafilatura (jina failed: ${jinaError.message})`;
      return fallback;
    } catch {
      throw jinaError;
    }
  }
}
