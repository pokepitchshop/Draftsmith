/**
 * Detect link type for the ingestion router.
 * Returns: article | docs | blog | github | youtube
 */

const DOCS_HOST_PATTERNS = [
  /^docs\./i,
  /\.readthedocs\./i,
  /^developer\./i,
  /^learn\./i,
];

const DOCS_PATH_PATTERNS = [
  /\/docs(\/|$)/i,
  /\/documentation(\/|$)/i,
  /\/reference(\/|$)/i,
];

const BLOG_HOST_PATTERNS = [/^blog\./i, /\.blog\./i, /medium\.com$/i, /dev\.to$/i];

const BLOG_PATH_PATTERNS = [/\/blog(\/|$)/i, /\/posts(\/|$)/i];

export function detectLinkType(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }

  const host = url.hostname.replace(/^www\./, "");
  const path = url.pathname;

  if (host === "youtu.be" || host.endsWith("youtube.com")) {
    return "youtube";
  }

  if (host === "github.com" || host === "raw.githubusercontent.com") {
    return "github";
  }

  if (
    DOCS_HOST_PATTERNS.some((re) => re.test(host)) ||
    DOCS_PATH_PATTERNS.some((re) => re.test(path))
  ) {
    return "docs";
  }

  if (
    BLOG_HOST_PATTERNS.some((re) => re.test(host)) ||
    BLOG_PATH_PATTERNS.some((re) => re.test(path))
  ) {
    return "blog";
  }

  return "article";
}

export function parseGitHubRepo(url) {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error(`Not a GitHub repo URL: ${url.href}`);
  }
  return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
}

export function parseYouTubeVideoId(url) {
  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    if (!id) throw new Error(`No YouTube video id in URL: ${url.href}`);
    return id;
  }

  if (host.endsWith("youtube.com")) {
    const fromQuery = url.searchParams.get("v");
    if (fromQuery) return fromQuery;

    const embedMatch = url.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/);
    if (embedMatch) return embedMatch[1];
  }

  throw new Error(`No YouTube video id in URL: ${url.href}`);
}
