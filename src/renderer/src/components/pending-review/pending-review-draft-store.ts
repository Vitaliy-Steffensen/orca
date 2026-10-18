import { useSyncExternalStore } from 'react'
import {
  mergePendingReviewComments,
  type PendingReviewComment,
  type PendingReviewDraftMap
} from '../../../../shared/github/pending-review-comment'
import { applyExternalPendingReviewSummary } from './pending-review-summary-store'

let drafts: PendingReviewDraftMap = {}
let loaded = false
let loading: Promise<void> | null = null
// Why kept apart: an edit made before the file finishes loading is newer than the file, and
// merging the file over it would quietly undo the edit — or bring a deleted draft back.
const writtenBeforeLoad = new Map<string, PendingReviewComment[]>()
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

function withQueue(
  map: PendingReviewDraftMap,
  worktreeId: string,
  comments: PendingReviewComment[]
): PendingReviewDraftMap {
  const next = { ...map }
  if (comments.length > 0) {
    next[worktreeId] = comments
  } else {
    delete next[worktreeId]
  }
  return next
}

/**
 * Takes a change an agent made straight to the file, so the shelf shows it without a reload.
 *
 * Why nothing happens before the load: the read already in flight is newer than this window's
 * empty queue and will bring the change in with it. The one exception is a workspace the
 * reviewer has already edited here, whose edit wins the load — the agent's comments are merged
 * into it so they are not the thing that edit erases.
 */
export function applyExternalPendingReviewDrafts(
  worktreeId: string,
  comments: PendingReviewComment[]
): void {
  if (!loaded) {
    const edited = writtenBeforeLoad.get(worktreeId)
    if (edited) {
      writtenBeforeLoad.set(worktreeId, mergePendingReviewComments(edited, comments))
    }
    return
  }
  drafts = withQueue(drafts, worktreeId, comments)
  emit()
}

let listeningForAgentStaging = false

// Why here rather than in a component: the store is what holds the queue, and a window that
// never renders the shelf still has to stay current for the status-bar count.
function listenForAgentStaging(): void {
  if (listeningForAgentStaging) {
    return
  }
  listeningForAgentStaging = true
  window.api?.pendingReview?.onDraftsChanged?.((change) => {
    if (change.comments) {
      applyExternalPendingReviewDrafts(change.worktreeId, change.comments)
    }
    if (change.summary !== undefined) {
      applyExternalPendingReviewSummary(change.worktreeId, change.summary)
    }
  })
}

/** Loads the queue from this device once; later calls share the first load. */
export function loadPendingReviewDrafts(): Promise<void> {
  listenForAgentStaging()
  // Why optional: a host without the fork's preload (an older build, a web client, a test) has
  // no queue on disk to read, and that must read as an empty queue rather than a crash.
  const read = window.api?.pendingReview?.readDrafts
  loading ??= (read ? read().catch(() => ({})) : Promise.resolve({})).then((stored) => {
    let merged: PendingReviewDraftMap = stored
    for (const [worktreeId, comments] of writtenBeforeLoad) {
      merged = withQueue(merged, worktreeId, comments)
    }
    writtenBeforeLoad.clear()
    drafts = merged
    loaded = true
    emit()
  })
  return loading
}

export function arePendingReviewDraftsLoaded(): boolean {
  return loaded
}

export function getPendingReviewDrafts(worktreeId: string): PendingReviewComment[] | undefined {
  return drafts[worktreeId]
}

/** Replaces one workspace's queue, in memory at once and on disk in the background. */
export function setPendingReviewDrafts(worktreeId: string, comments: PendingReviewComment[]): void {
  drafts = withQueue(drafts, worktreeId, comments)
  if (!loaded) {
    writtenBeforeLoad.set(worktreeId, comments)
  }
  emit()
  void window.api?.pendingReview?.writeDrafts(worktreeId, comments).catch((error: unknown) => {
    console.error('[pending-review] could not save queued comments:', error)
  })
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  void loadPendingReviewDrafts()
  return () => {
    listeners.delete(listener)
  }
}

export function usePendingReviewDrafts(worktreeId: string | null): {
  comments: PendingReviewComment[] | undefined
  loaded: boolean
} {
  const readComments = (): PendingReviewComment[] | undefined =>
    worktreeId ? drafts[worktreeId] : undefined
  const readLoaded = (): boolean => loaded
  // Why a server snapshot: some surfaces render through react-dom/server, where omitting it throws.
  const comments = useSyncExternalStore(subscribe, readComments, readComments)
  const isLoaded = useSyncExternalStore(subscribe, readLoaded, readLoaded)
  return { comments, loaded: isLoaded }
}
