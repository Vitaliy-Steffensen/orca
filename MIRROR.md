# Mirroring `frbarbre/orca`

This fork does not maintain its own merge with upstream. It **mirrors `frbarbre/orca:main`
byte-for-byte**, plus one commit that points the release and update channel at this repository.

Frederik's fork carries ~220 commits on top of `stablyai/orca` and resolves every upstream sync by
hand — the procedure, the conflict policy and the per-sync log are in [`FORK.md`](./FORK.md), which
is his file and is taken verbatim. Re-deriving that work here would double it and drift. Taking his
tree whole is deterministic: the result is exactly the tree his `fork verify` check passed on.

## What this fork owns

One commit, five lines, four files — the release channel:

| File                                                    | Line                                         |
| ------------------------------------------------------- | -------------------------------------------- |
| `config/electron-builder.config.cjs`                    | `ORCA_PUBLISH_OWNER ?? 'Vitaliy-Steffensen'` |
| `src/main/updater/updater-manual-install.ts`            | `FORK_REPO_URL`                              |
| `src/main/updater/fork-install/fork-self-install.ts`    | `FORK_REPO_URL`                              |
| `config/scripts/fork-disable-upstream-pr-workflows.mjs` | `REPO`                                       |
| `.github/workflows/fork-verify.yml`                     | the owner grep in "Update channel survived"  |

Both `FORK_REPO_URL` constants are runtime fallbacks, not build-time config: a packaged app has no
`ORCA_RELEASES_REPO_URL` in its environment, so these are what `armForkUpdateChannel()` falls back
to and therefore what the installed app checks for updates. `fork-release.yml` needs no change — it
already resolves everything from `github.repository`.

Nothing else is retargeted. The `frbarbre` strings left in test files are GitHub-username fixtures
and have no bearing on the channel; changing them would only add conflict surface.

One more line, a bug rather than a preference: `fork-verify.yml` asked `setup-bun` for
`config/bun-version`, but the tracked file is `config/.bun-version` — the name every upstream
workflow uses. Corrected in both jobs. Drop this if Frederik fixes it upstream.

## Re-mirroring

```bash
git fetch frederik main --no-tags          # https://github.com/frbarbre/orca.git
git switch -c mirror/$(date +%Y-%m-%d) frederik/main
git cherry-pick <the release-channel commit>
```

A conflict in the cherry-pick means Frederik touched one of those five lines — the only case that
needs a human. Then run [Verify](./FORK.md#verify) and fast-forward `main` to the branch head.

`main` here is permanently diverged from `origin/main` as GitHub sees it, so the push is
`git push --force-with-lease=refs/heads/main:<old sha> origin HEAD:main`.

**Push over SSH.** `origin` is an SSH URL on purpose. A sync routinely changes files under
`.github/workflows/`, and GitHub refuses that over HTTPS unless the OAuth token carries the
`workflow` scope — `gh`'s does not:

```
! [remote rejected] HEAD -> main (refusing to allow an OAuth App to create or
  update workflow `.github/workflows/adhoc-mac-build.yml` without `workflow` scope)
```

SSH is not subject to that restriction. Switching back to an HTTPS remote reintroduces the failure.

**Then disable upstream's pull-request workflows**, which arrive from the sync enabled and would
otherwise each run on every pull request opened here:

```bash
node config/scripts/fork-disable-upstream-pr-workflows.mjs   # --dry-run to preview
```

## The first release

`nextForkVersion` counts on from the newest `v*` tag and throws
`No earlier fork release to count from` when there is none. This repository has no release tags
yet, so the first release has to name its version:

```bash
gh workflow run fork-release.yml --repo Vitaliy-Steffensen/orca --ref main -f version=1.5.0
```

Pick something above anything the installed app might already be running — the updater only offers
a version higher than its own. After that the line counts itself, as described in
[FORK.md § Releasing](./FORK.md#releasing).

## Running Verify locally

Verify is a GitHub check, but it reproduces locally once the toolchain matches CI:

```bash
nvm use 24                    # package.json pins engines.node: 24
                              # Node 22 cannot load .anti-slop-plugin/index.ts, so pnpm lint dies
                              # at audit:anti-slop with ERR_UNKNOWN_FILE_EXTENSION
bun --version                 # must be config/.bun-version; Vitest runs under --bun
pnpm install
pnpm lint
pnpm typecheck
ORCA_BACKGROUND_LAUNCH=1 ./config/scripts/test-fork-features.sh
```

`pnpm install` rewrites `pnpm-lock.yaml` with an `@pnpm/exe` entry even under `--frozen-lockfile`.
That is pnpm 12 recording its own platform binary, not a dependency change — discard it.
