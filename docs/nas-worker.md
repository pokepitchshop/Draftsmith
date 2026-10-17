# NAS worker (POK-637)

Drop a link into a folder on the NAS and get a draft PR back in the NAS Gitea (`http://192.168.1.134:3001/pokepitchshop/draftsmith`). Drafts are generated on the local Ollama (Windows 2070, `192.168.1.12`); no hosted model API, and drafts never leave your network.

Linear: [POK-637](https://linear.app/pokepitchshop/issue/POK-637)

## How it works

```text
inbox/go-routing.txt
        ↓  worker polls every 15s (skips files still being copied)
  Ollama reachable?  no → job waits in the inbox
        ↓ yes
  claim → inbox/processing/
  sync GitHub main → Gitea main (fast-forward or merge, never force)
  work/repo: reset to Gitea main
  draftsmith new <url> …        (ingest → manifest + source-material)
  draftsmith run --provider ollama   (draft → self-edit → code check → exports)
  commit on draft/<slug> → push to Gitea → open Gitea PR
        ↓
  inbox/done/go-routing.txt(.log)   ← PR URL in the log
  inbox/failed/…(.log)              ← why it failed
```

- If a step fails (e.g. an export check), the work is still pushed and the PR opens with a `WIP:` title, with the error in the PR body.
- If code samples fail the code check, exports are skipped and the PR opens as `WIP:` with `code-check-failed.md`. Warnings (e.g. a suspicious `go get`, or nothing checkable) show as ⚠️ in the PR's step table.
- If the slug already exists on `main`, the job fails. Add a `slug:` line to pick another.
- If `draft/<slug>` already exists in Gitea, the branch gets a timestamp suffix.
- If GitHub main and Gitea main changed the same file differently, the job fails and Gitea main is left untouched; resolve by hand.
- If the worker restarts mid-job, the job goes back to the inbox and runs again.

## Repos: Gitea for review, GitHub for code

| | Gitea (NAS, private) | GitHub (public) |
|---|---|---|
| Role | Review drafts | Code + published articles |
| `main` | GitHub main + approved drafts | Code you merge as usual |
| Draft branches / PRs | ✅ | Never pushed by the worker |

**Approve a draft:** merge its PR in Gitea.

**Publish approved drafts to GitHub** (deliberate; this makes them public):

```bash
git fetch http://192.168.1.134:3001/pokepitchshop/draftsmith.git main
git push origin FETCH_HEAD:main
```

GitHub then fast-forwards and the next sync is a no-op.

## Job files

One plain-text file per article. The first line is the URL; everything else is optional.

```text
https://go.dev/blog/routing-enhancements
slug: go-122-routing-enhancements
channels: medium, tommarler
angle: Try Go 1.22 method + wildcard routing on a tiny API
```

| Key | Default | Notes |
|-----|---------|-------|
| `slug` | derived from URL | kebab-case |
| `title` | from the page | |
| `channels` | `medium` | `medium`, `tommarler`, `x` (X stays blocked until `canonical_url` is set) |
| `angle` | none | one-liner steering the draft |
| `series` + `part` | none | set both or neither |
| `engine` | `auto` | `auto`, `jina`, `trafilatura` |

Lines starting with `#` are comments.

## Deploy on the Synology

1. **Gitea token + repo.** Token for `pokepitchshop` with scope `write:repository`, and a private repo `pokepitchshop/draftsmith` (empty; the worker seeds `main` from GitHub on the first job).
2. **Folders and app snapshot** (from your Mac, in this repo):
   ```bash
   ssh nas 'mkdir -p /volume1/docker/draftsmith/{app,inbox,work}'
   git archive HEAD package.json scripts deploy | ssh nas 'tar -x -C /volume1/docker/draftsmith/app'
   scp deploy/nas/compose.yaml nas:/volume1/docker/draftsmith/
   scp deploy/nas/.env.example nas:/volume1/docker/draftsmith/.env
   ```
3. **Configure.** Edit `/volume1/docker/draftsmith/.env` on the NAS and paste `FORGE_TOKEN`.
4. **Start.**
   ```bash
   ssh nas 'cd /volume1/docker/draftsmith && /usr/local/bin/docker compose up -d --build'
   ssh nas '/usr/local/bin/docker logs -f draftsmith-worker'
   ```

To update the worker after merging changes, repeat the `git archive` line and `docker compose up -d --build`. The pipeline itself (prompts, steps, exports) comes from Gitea `main` (synced from GitHub) on every job, so most changes need no redeploy.

## Dropping links

The inbox is `/volume1/docker/draftsmith/inbox/`, inside the `docker` shared folder, so you can drop files over SMB from the Mac (Finder → Go → Connect to Server → `smb://192.168.1.134/docker`) or from n8n.

## Security

- The Gitea token is passed per git command as an HTTP header scoped to the Gitea host. It is never written to `work/repo/.git/config`, never sent to GitHub, and is redacted from logs.
- `.env` is gitignored; never commit it.
- The worker runs as `thomas.marler` (1026:100), not root.
- Drafts stay on the NAS until you publish approved ones to GitHub (a public repo).

## Quality

The 2070 runs a 7B model. Every PR is a first draft: check commands, APIs, and versions before publishing. The PR body includes a review checklist. The code check catches code that doesn't compile and bad `go get` paths, but not code that compiles and is still wrong, Java samples, or fragments.
