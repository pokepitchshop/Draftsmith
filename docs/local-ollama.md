# Local Ollama provider (POK-635)

Run pipeline steps on your own GPU with [Ollama](https://ollama.com). No hosted model API: the only providers are `agent` (hand the prompt to Cursor) and `ollama` (local).

Linear: [POK-635](https://linear.app/pokepitchshop/issue/POK-635)

## How it works

```text
draftsmith run <slug> --provider ollama
        ↓
  step registry (scripts/lib/pipeline.mjs)
        ↓  prompt file + every input file inlined into one request
  Ollama /api/chat (streamed)
        ↓
  runner writes output file(s) → runs validator → advances manifest status
```

The model never touches the filesystem. The runner reads the inputs, tells the model which file its reply becomes, and writes it. That is what makes an 8B model workable.

## Set up the GPU box (RTX 2070, 8 GB)

On a Linux host with the NVIDIA driver and `nvidia-container-toolkit` installed:

```bash
docker run -d --gpus=all --restart unless-stopped \
  -v ollama:/root/.ollama -p 11434:11434 \
  --name ollama ollama/ollama

docker exec -it ollama ollama pull qwen3:8b
```

Check from your Mac:

```bash
curl http://<gpu-box>:11434/api/tags
```

Ollama has **no authentication**. Keep port 11434 on your LAN (or Tailscale). Do not port-forward it.

### Sharing the GPU with Home Assistant

Home Assistant keeps `qwen2.5:7b` loaded with `num_ctx` 8192 and `keep_alive: -1`. Draftsmith asks for 16384, so Ollama reloads the model when Draftsmith runs, and Home Assistant's next request reloads it again (~15s). At low traffic that is fine.

### Models that fit 8 GB

| Model | Notes |
|-------|-------|
| `qwen2.5:7b` | Current config, shared with Home Assistant and sdvosb-app on the Windows box (192.168.1.12). ~5 GB VRAM. Dropped prose in 2 of 2 full Medium-export runs, which is why exports are now built in code. |
| `llama3.1:8b` | Medium export passed the export check (tested on an M4 Pro, ~30s). |
| `qwen3:8b` | Untested here; strong instruction following on paper. |
| 12B+ | Spills to CPU at 16k context; expect it to be much slower. |

## Configure

`draftsmith.config.json` at the repo root:

```json
{
  "defaultProvider": "agent",
  "ollama": {
    "host": "http://localhost:11434",
    "model": "qwen3:8b",
    "num_ctx": 16384,
    "temperature": 0.6
  },
  "steps": {
    "export-x": { "provider": "ollama", "model": "llama3.1:8b" }
  }
}
```

- `defaultProvider` stays `agent`, so nothing changes until you opt in.
- `steps.<id>` overrides `provider`, `model`, or `num_ctx` for one step. Step ids: `draft`, `self-edit`, `export-medium`, `export-tommarler`, `export-x`.
- Precedence: CLI flags > env vars (`OLLAMA_HOST`, `DRAFTSMITH_MODEL`) > config file > defaults.

Point at the GPU box without editing the file:

```bash
export OLLAMA_HOST=gpu-box.local:11434
```

## Run

```bash
# Everything on Ollama, stop before the X export
node scripts/draftsmith.mjs run <slug> --provider ollama --until export-x

# One-off model
node scripts/draftsmith.mjs run <slug> --provider ollama --model llama3.1:8b
```

The run continues step by step until it finishes, hits `--until`, hits an `agent` step (handoff), is blocked, or fails. Re-running picks up where it stopped, because steps whose output exists are skipped. To redo a step, delete its output file.

## Guards

- **Context:** Ollama silently truncates prompts over `num_ctx`. The runner estimates the prompt size and fails *before* sending if prompt + 4096 output tokens would exceed it. Draft steps on long sources are the usual culprit (Gorilla Mux URL params is ~10k). Raise `num_ctx` (more VRAM) or trim `source-material.md`.
- **Preconditions:** `export-x` is blocked until `canonical_url` is set.
- **Code check (POK-638):** after self-edit, the `check` step compiles or parses the code blocks in `draft-v2.md`, with no model involved. Nothing is executed.
  - `go` files that start with `package` → `go vet` in a temp module. Fragments are skipped.
  - Shell → `bash -n`, and every `go get` target must resolve. A target that isn't an importable package (e.g. `github.com/golang/go`) is a warning.
  - `json` must parse; `xml` must be well-formed.
  - `java`, `properties`, `yaml`, `markdown` are skipped.

  Pass writes `code-check.md`. Fail writes `code-check-failed.md` and stops before exports; fix `draft-v2.md` and re-run. A draft whose code blocks are all fragments gets a "nothing checkable" warning instead of a clean pass.
- **Exports in code (POK-636):** `export-medium` is built in code from `draft-v2.md` for every provider (screenshot markers → `<!-- image -->`, `Draft notes` removed, code fences untouched). `export-tommarler` builds its body the same way; with `ollama` the model only writes the frontmatter `description` + `tags` as JSON.
- **Export check:** `export-medium` and `export-tommarler` must carry every paragraph of `draft-v2.md` over unchanged. Screenshot markers, `Draft notes`, and bare URLs that become links don't count as changes. Small models sometimes drop the opening paragraph; this catches it.
- **Validators:** `export-x` runs `validate-x-export.mjs`.
- A failed check or validator stops the run, leaves the output on disk, and does not advance the status. Fix the file, or delete it and re-run.
- **Status:** the runner advances `manifest.status` (`draft` → `review` → `exported`) after Ollama steps and never moves it backwards.

## Quality

Small local models get technical details wrong more often. Treat every Ollama output as a first draft: check commands and APIs before publishing (see `docs/publish-checklist.md`).
