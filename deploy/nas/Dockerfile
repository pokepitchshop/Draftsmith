# Draftsmith NAS worker (POK-637). Build context: repo root.
FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends git python3 python3-venv ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Python ingest fallbacks (YouTube transcripts, trafilatura); the pipeline calls `python3`.
COPY scripts/requirements-ingest.txt /tmp/requirements-ingest.txt
RUN python3 -m venv /opt/ingest \
  && /opt/ingest/bin/pip install --no-cache-dir -r /tmp/requirements-ingest.txt
ENV PATH=/opt/ingest/bin:$PATH \
    HOME=/work

WORKDIR /app
COPY package.json ./
COPY scripts ./scripts

CMD ["node", "scripts/worker.mjs"]
