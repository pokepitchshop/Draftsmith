/**
 * Route a URL to the correct ingestion handler.
 */

import { detectLinkType } from "./detect-link-type.mjs";
import { ingestArticleLike } from "./ingest-article.mjs";
import { ingestGitHub } from "./ingest-github.mjs";
import { ingestYouTube } from "./ingest-youtube.mjs";

export async function ingestLink(url, { engine = "auto" } = {}) {
  const linkType = detectLinkType(url);

  let result;
  switch (linkType) {
    case "youtube":
      result = ingestYouTube(url);
      break;
    case "github":
      result = await ingestGitHub(url);
      break;
    case "article":
    case "docs":
    case "blog":
      result = await ingestArticleLike(url, linkType, { engine });
      break;
    default:
      throw new Error(`Unsupported link type: ${linkType}`);
  }

  return {
    url,
    link_type: linkType,
    title: result.title,
    markdown: result.markdown,
    engine: result.engine,
  };
}
