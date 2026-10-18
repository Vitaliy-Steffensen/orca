import { useEffect, useSyncExternalStore } from 'react'
import {
  EMPTY_VIEWED_FILES_STATE,
  clearFileViewed,
  markFileViewed,
  type ViewedFilesState
} from '../../../../../shared/diff-review-identity'

const stateByWorkspace = new Map<string, ViewedFilesState>()
const loadingByWorkspace = new Map<string, Promise<void>>()
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

/** Loads one workspace's ticked-off files once; later calls share the first load. */
function load(worktreeId: string): Promise<void> {
  // Why optional: a host without the fork's preload (an older build, a web client, a test) has
  // nothing on disk to read, and that must read as nothing ticked rather than a crash.
  const read = window.api?.pendingReview?.readViewedFiles
  let pending = loadingByWorkspace.get(worktreeId)
  if (!pending) {
    pending = (
      read
        ? read(worktreeId).catch(() => EMPTY_VIEWED_FILES_STATE)
        : Promise.resolve(EMPTY_VIEWED_FILES_STATE)
    ).then((stored) => {
      // Why only when still absent: a tick made while the read was in flight is newer than the file.
      if (!stateByWorkspace.has(worktreeId)) {
        stateByWorkspace.set(worktreeId, stored)
        emit()
      }
    })
    loadingByWorkspace.set(worktreeId, pending)
  }
  return pending
}

function write(worktreeId: string, next: ViewedFilesState): void {
  stateByWorkspace.set(worktreeId, next)
  emit()
  void window.api?.pendingReview?.writeViewedFiles(worktreeId, next).catch((error: unknown) => {
    console.error('[pr-diff] could not save the files you ticked off:', error)
  })
}

export function setFileViewed(
  worktreeId: string,
  path: string,
  identity: string,
  viewed: boolean
): void {
  const current = stateByWorkspace.get(worktreeId) ?? EMPTY_VIEWED_FILES_STATE
  const now = Date.now()
  write(
    worktreeId,
    viewed ? markFileViewed(current, path, identity, now) : clearFileViewed(current, path, now)
  )
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useViewedFiles(worktreeId: string | null): ViewedFilesState {
  useEffect(() => {
    if (worktreeId) {
      void load(worktreeId)
    }
  }, [worktreeId])
  const read = (): ViewedFilesState =>
    (worktreeId ? stateByWorkspace.get(worktreeId) : undefined) ?? EMPTY_VIEWED_FILES_STATE
  // Why a server snapshot: some surfaces render through react-dom/server, where omitting it throws.
  return useSyncExternalStore(subscribe, read, read)
}
