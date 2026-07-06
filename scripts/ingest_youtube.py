#!/usr/bin/env python3
"""Fetch YouTube transcript via youtube-transcript-api."""

import json
import sys

try:
    from youtube_transcript_api import YouTubeTranscriptApi
except ImportError as exc:
    print(
        "youtube-transcript-api not installed — run: pip install -r scripts/requirements-ingest.txt",
        file=sys.stderr,
    )
    raise SystemExit(1) from exc


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: ingest_youtube.py <video_id> [source_url]", file=sys.stderr)
        raise SystemExit(1)

    video_id = sys.argv[1]
    source_url = sys.argv[2] if len(sys.argv) > 2 else f"https://www.youtube.com/watch?v={video_id}"

    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
    except Exception as exc:  # noqa: BLE001 — surface library errors to CLI
        print(f"Transcript unavailable for {video_id}: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc

    lines = [entry.get("text", "").strip() for entry in transcript if entry.get("text")]
    body = "\n".join(lines).strip()

    if not body:
        print("Transcript was empty", file=sys.stderr)
        raise SystemExit(1)

    markdown = f"""# YouTube transcript — {video_id}

**Source:** {source_url}

## Transcript

{body}
""".strip()

    print(json.dumps({"title": f"YouTube {video_id}", "markdown": markdown}))


if __name__ == "__main__":
    main()
