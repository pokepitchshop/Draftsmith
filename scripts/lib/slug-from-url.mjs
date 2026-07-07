/**
 * Derive a kebab-case article slug from a URL (POK-426).
 */

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function toKebab(value) {
  return value
    .toLowerCase()
    .replace(/\.(html?|md|php|aspx)$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

/**
 * @param {string} rawUrl
 * @returns {string} kebab-case slug
 */
export function slugFromUrl(rawUrl) {
  const url = new URL(rawUrl);
  const host = url.hostname.replace(/^www\./, "");

  if (host === "github.com" || host === "raw.githubusercontent.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return toKebab(`${parts[1]}-${parts[0]}`);
    }
  }

  if (host === "youtu.be" || host.endsWith("youtube.com")) {
    const id =
      host === "youtu.be"
        ? url.pathname.slice(1).split("/")[0]
        : url.searchParams.get("v") || url.pathname.split("/").pop();
    return toKebab(`youtube-${id ?? "video"}`);
  }

  const pathParts = url.pathname.split("/").filter(Boolean);
  const skip = new Set(["docs", "documentation", "reference", "api", "blog", "posts"]);
  const meaningful = pathParts.filter((part) => !skip.has(part.toLowerCase()));

  if (meaningful.length > 0) {
    const candidate = toKebab(meaningful[meaningful.length - 1]);
    if (candidate.length >= 3) return candidate;
  }

  const hostSlug = toKebab(host.split(".")[0]);
  return hostSlug || "link-draft";
}

export function isValidSlug(slug) {
  return SLUG_PATTERN.test(slug);
}
