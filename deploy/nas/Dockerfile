# Draftsmith NAS worker (POK-637). Build context: repo root.
FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends git python3 python3-venv ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Python ingest fallbacks (YouTube transcripts, trafilatura); the pipeline calls `python3`.
COPY scripts/requirements-ingest.txt /tmp/requirements-ingest.txt
RUN python3 -m venv /opt/ingest \
  && /opt/ingest/bin/pip install --no-cache-dir -r /tmp/requirements-ingest.txt
# Go toolchain for the code-check step (POK-638). Debian's golang is too old for
# Go 1.22+ samples. Module + build caches live under HOME (/work), so they persist.
COPY --from=golang:1.27.2-bookworm /usr/local/go /usr/local/go
ENV PATH=/usr/local/go/bin:/opt/ingest/bin:$PATH \
    HOME=/work \
    GOTOOLCHAIN=local

WORKDIR /app
COPY package.json ./
COPY scripts ./scripts

CMD ["node", "scripts/worker.mjs"]
