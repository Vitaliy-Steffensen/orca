import { useSyncExternalStore } from 'react'
import type { ViewerReviewRequest } from '../../../../shared/github/viewer-review-request'

let requests: ReadonlyMap<string, ViewerReviewRequest> = new Map()
const listeners = new Set<() => void>()

function isSameRequest(a: ViewerReviewRequest | undefined, b: ViewerReviewRequest): boolean {
  return a?.requestedAt === b.requestedAt && a?.isReRequest === b.isReRequest
}

export function setViewerReviewRequests(next: ReadonlyMap<string, ViewerReviewRequest>): void {
  const unchanged =
    next.size === requests.size &&
    [...next].every(([id, request]) => isSameRequest(requests.get(id), request))
  if (unchanged) {
    return
  }
  requests = next
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

export function useViewerReviewRequest(worktreeId: string): ViewerReviewRequest | null {
  const read = (): ViewerReviewRequest | null => requests.get(worktreeId) ?? null
  return useSyncExternalStore(subscribe, read, read)
}
