/**
 * Ingest GitHub repos via REST API — README + file tree, not rendered HTML.
 */

import { parseGitHubRepo } from "./detect-link-type.mjs";

const GITHUB_API = "https://api.github.com";

function githubHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "draftsmith-link-ingest",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

async function githubGet(path) {
  const response = await fetch(`${GITHUB_API}${path}`, { headers: githubHeaders() });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${path} failed (${response.status}): ${body.slice(0, 200)}`);
  }

  return response.json();
}

async function fetchReadme(owner, repo) {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/readme`, {
    headers: {
      ...githubHeaders(),
      Accept: "application/vnd.github.raw",
    },
  });

  if (response.status === 404) {
    return "_No README found in this repository._";
  }

  if (!response.ok) {
    throw new Error(`GitHub README fetch failed (${response.status})`);
  }

  return (await response.text()).trim();
}

function formatTree(treeEntries, maxEntries = 120) {
  const files = treeEntries
    .filter((entry) => entry.type === "blob")
    .map((entry) => entry.path)
    .sort();

  const truncated = files.length > maxEntries;
  const shown = files.slice(0, maxEntries);

  const lines = ["```text", ...shown.map((path) => path)];
  if (truncated) {
    lines.push(`... (${files.length - maxEntries} more files)`);
  }
  lines.push("```");

  return lines.join("\n");
}

export async function ingestGitHub(rawUrl) {
  const url = new URL(rawUrl);
  const { owner, repo } = parseGitHubRepo(url);

  const meta = await githubGet(`/repos/${owner}/${repo}`);
  const defaultBranch = meta.default_branch || "main";
  const readme = await fetchReadme(owner, repo);

  let treeSection = "_File tree unavailable._";
  try {
    const tree = await githubGet(
      `/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`
    );
    treeSection = formatTree(tree.tree || []);
  } catch {
    // tree is optional — README alone is still useful
  }

  const title = meta.full_name || `${owner}/${repo}`;
  const description = meta.description ? `> ${meta.description}\n\n` : "";

  const markdown = `# ${title}

${description}**Default branch:** \`${defaultBranch}\`
**Language:** ${meta.language || "unknown"}
**URL:** ${meta.html_url}

## README

${readme}

## File tree (\`${defaultBranch}\`)

${treeSection}
`.trim();

  return { title, markdown, engine: "github-api" };
}
