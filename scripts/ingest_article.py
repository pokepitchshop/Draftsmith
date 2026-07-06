#!/usr/bin/env python3
"""Fetch article HTML and extract clean markdown via trafilatura."""

import json
import sys

try:
    import trafilatura
except ImportError as exc:
    print(
        "trafilatura not installed — run: pip install -r scripts/requirements-ingest.txt",
        file=sys.stderr,
    )
    raise SystemExit(1) from exc


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: ingest_article.py <url>", file=sys.stderr)
        raise SystemExit(1)

    url = sys.argv[1]
    downloaded = trafilatura.fetch_url(url)
    if not downloaded:
        print(f"Failed to download: {url}", file=sys.stderr)
        raise SystemExit(1)

    markdown = trafilatura.extract(
        downloaded,
        output_format="markdown",
        include_links=True,
        include_tables=True,
    )

    if not markdown or len(markdown.strip()) < 80:
        print("trafilatura extracted empty or very short content", file=sys.stderr)
        raise SystemExit(1)

    metadata = trafilatura.extract_metadata(downloaded)
    title = metadata.title if metadata and metadata.title else url

    print(json.dumps({"title": title, "markdown": markdown.strip()}))


if __name__ == "__main__":
    main()
