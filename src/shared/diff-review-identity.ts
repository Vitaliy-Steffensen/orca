import type { GitBranchChangeEntry } from './git-diff-compare-types'

/** One file the reviewer ticked off, and the version of it they ticked. */
export type ViewedFileState = {
  viewedAt: number
  viewedIdentity: string
}

export type ViewedFilesState = {
  version: 1
  updatedAt?: number
  files: Record<string, ViewedFileState>
}

export const EMPTY_VIEWED_FILES_STATE: ViewedFilesState = { version: 1, files: {} }

/** FNV-1a over the joined parts. Short, stable across runs, and cheap enough for every row. */
export function buildDiffReviewIdentity(parts: readonly string[]): string {
  let hash = 2166136261
  for (const part of parts) {
    hash = Math.imul(hash ^ part.length, 16777619)
    for (let index = 0; index < part.length; index += 1) {
      hash = Math.imul(hash ^ part.charCodeAt(index), 16777619)
    }
  }
  return `d${(hash >>> 0).toString(36)}`
}

/**
 * What the reviewer actually read for one file. The blob oids pin the committed and staged content
 * exactly, so a commit that leaves this file alone leaves its identity alone. The base-relative line
 * counts are the only signal available for an unstaged working-tree edit.
 */
export function buildChangedFileIdentity(entry: GitBranchChangeEntry): string {
  return buildDiffReviewIdentity([
    entry.path,
    entry.oldPath ?? '',
    entry.status,
    entry.baseOid ?? '',
    entry.headOid ?? '',
    entry.indexOid ?? '',
    String(entry.added ?? ''),
    String(entry.removed ?? '')
  ])
}

export function isFileViewed(fileState: ViewedFileState | undefined, identity: string): boolean {
  return fileState !== undefined && fileState.viewedIdentity === identity
}

export function didFileChangeSinceViewed(
  fileState: ViewedFileState | undefined,
  identity: string
): boolean {
  return fileState !== undefined && fileState.viewedIdentity !== identity
}

export function markFileViewed(
  state: ViewedFilesState,
  path: string,
  identity: string,
  now: number
): ViewedFilesState {
  return {
    version: 1,
    updatedAt: now,
    files: { ...state.files, [path]: { viewedAt: now, viewedIdentity: identity } }
  }
}

export function clearFileViewed(
  state: ViewedFilesState,
  path: string,
  now: number
): ViewedFilesState {
  if (state.files[path] === undefined) {
    return state
  }
  const files = { ...state.files }
  delete files[path]
  return { version: 1, updatedAt: now, files }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function normalizeViewedFilesState(value: unknown): ViewedFilesState {
  if (!isRecord(value) || !isRecord(value.files)) {
    return EMPTY_VIEWED_FILES_STATE
  }
  const files: Record<string, ViewedFileState> = {}
  for (const [path, candidate] of Object.entries(value.files)) {
    if (!path || !isRecord(candidate)) {
      continue
    }
    const { viewedAt, viewedIdentity } = candidate
    if (typeof viewedAt === 'number' && typeof viewedIdentity === 'string' && viewedIdentity) {
      files[path] = { viewedAt, viewedIdentity }
    }
  }
  return {
    version: 1,
    ...(typeof value.updatedAt === 'number' ? { updatedAt: value.updatedAt } : {}),
    files
  }
}

export type ViewedFilesByWorkspace = {
  version: 1
  byWorkspace: Record<string, ViewedFilesState>
}

export function normalizeViewedFilesByWorkspace(value: unknown): ViewedFilesByWorkspace {
  if (!isRecord(value) || !isRecord(value.byWorkspace)) {
    return { version: 1, byWorkspace: {} }
  }
  const byWorkspace: Record<string, ViewedFilesState> = {}
  for (const [workspaceId, candidate] of Object.entries(value.byWorkspace)) {
    if (!workspaceId) {
      continue
    }
    const state = normalizeViewedFilesState(candidate)
    if (Object.keys(state.files).length > 0) {
      byWorkspace[workspaceId] = state
    }
  }
  return { version: 1, byWorkspace }
}
