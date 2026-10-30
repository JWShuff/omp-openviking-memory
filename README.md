# OpenViking memory for OMP

A normal OMP plugin: the **official OpenViking pi extension** (`volcengine/OpenViking`,
vendored at a pinned tag) packaged as an npm/git-installable plugin. Replaces the
retired `omp-openviking-memory` port whose upstream repository no longer exists.

## Install

```bash
omp plugin install github:JWShuff/omp-openviking-memory
```

Bun installs the plugin's dependencies, and OMP validates the extension at install
time (import + factory + throwaway registration) — a broken build rolls back the
install instead of landing. Restart the session afterwards.

Upgrade:

```bash
omp plugin upgrade openviking-memory
```

Migrating from the old port — uninstall it once the new plugin works:

```bash
omp plugin uninstall omp-openviking-memory
omp plugin marketplace remove omp-openviking-memory-marketplace
```

> The marketplace path is intentionally not used: marketplace installs symlink the
> cloned repo without running `npm`/`bun install`, so the plugin's runtime
> dependency would be missing. The npm/git install path handles dependencies.

## What it does

- **Recall** — automatic pre-prompt recall (`context` hook) plus skill discovery.
- **Capture** — syncs turns with the batch endpoint
  (`/api/v1/sessions/{id}/messages/batch`) and commits for long-term extraction.
- **Takeover** — optional; replaces committed history with the archive overview.
  Off by default upstream since OpenViking 0.5; enable with `takeoverEnabled: true`.
- **Tools** — OpenViking MCP tools (`find`, `search`, `read`, `write`, `edit`,
  `remember`, ...) through the bundled MCP bridge.

## Configuration

Same resolution chain as the `ov` CLI and the other OpenViking plugins:

1. Environment: `OPENVIKING_URL` / `OPENVIKING_BASE_URL`, `OPENVIKING_API_KEY` /
   `OPENVIKING_BEARER_TOKEN`, `OPENVIKING_ACCOUNT`, `OPENVIKING_USER`, `OPENVIKING_PEER_ID`
2. `~/.openviking/ovcli.conf` (`plugin.pi`, then `plugin`)
3. `~/.openviking/ov.conf` `agent_plugins`, then `server`
4. Defaults: `http://127.0.0.1:1933`, no auth

Debug logging: `OPENVIKING_DEBUG=1` (path via `OV_DEBUG_LOG` / `OPENVIKING_DEBUG_LOG`).

## Updating from upstream

`.github/workflows/upstream-sync.yml` runs the sync weekly (and on demand) and opens
a PR with the refreshed tree — review and merge. Locally:

```bash
node scripts/sync-upstream.mjs          # pinned tag
node scripts/sync-upstream.mjs v0.5.3   # explicit tag
```

The script sparse-clones the upstream tag, regenerates the shared runtime and
skills, copies the extension over the repo root, and reapplies the plugin manifest.

## Provenance

- Upstream: `volcengine/OpenViking` → `examples/pi-coding-agent-extension`
  (extension version `0.4.22`), tag pinned in `scripts/sync-upstream.mjs`.
- `shared/`, `skills/`, and `memory-plugin-shared/` are generated from
  `examples/memory-plugin-shared` at the same tag.
- Additions in this repo: `plugin.json`, the `omp`/`pi` entries in `package.json`,
  the root layout, and the sync/CI tooling. Upstream's own README is kept as
  [UPSTREAM-README.md](UPSTREAM-README.md).
- License: AGPL-3.0, see [LICENSE](LICENSE).
