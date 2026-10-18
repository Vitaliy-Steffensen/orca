import { useEffect, useSyncExternalStore } from 'react'

export type GitHubViewerIdentity = { login: string; avatarUrl: string }

type ViewerSnapshot = {
  viewer: GitHubViewerIdentity | null
  settled: boolean
}

let snapshot: ViewerSnapshot = { viewer: null, settled: false }
const listeners = new Set<() => void>()
let started = false

function emit(next: ViewerSnapshot): void {
  snapshot = next
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function readSnapshot(): ViewerSnapshot {
  return snapshot
}

function startLookup(): void {
  if (started) {
    return
  }
  started = true
  // Why a shared lookup: every workspace card asks who "me" is, and one `gh` call answers all of them.
  void Promise.resolve()
    .then(() => window.api.gh.viewer())
    .then((result) => {
      if (!result?.login) {
        emit({ viewer: null, settled: true })
        return
      }
      emit({
        viewer: {
          login: result.login,
          avatarUrl: `https://github.com/${result.login}.png`
        },
        settled: true
      })
    })
    .catch(() => {
      emit({ viewer: null, settled: true })
    })
}

/**
 * Who the signed-in reviewer is, so a queued comment can be shown under their own
 * name and face rather than a placeholder.
 *
 * Why the avatar is derived: `gh` reports the login, not the picture, and
 * `github.com/<login>.png` is the same fallback the comment rows already use.
 */
export function useGitHubViewer(): GitHubViewerIdentity | null {
  const current = useSyncExternalStore(subscribe, readSnapshot, readSnapshot)
  useEffect(() => {
    startLookup()
  }, [])
  return current.viewer
}

/** True once the signed-in login lookup has finished, including when GitHub could not answer. */
export function useGitHubViewerLookupSettled(): boolean {
  const current = useSyncExternalStore(subscribe, readSnapshot, readSnapshot)
  useEffect(() => {
    startLookup()
  }, [])
  return current.settled
}
