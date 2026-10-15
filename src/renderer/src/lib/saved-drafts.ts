import { useCallback, useState, useSyncExternalStore } from 'react'

type SavedDraft = { text: string; savedAt: number }

const STORAGE_KEY = 'orca.savedDrafts.v1'
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const MAX_DRAFTS = 300

let drafts: Record<string, SavedDraft> = load()
const listeners = new Set<() => void>()

function isSavedDraft(value: unknown): value is SavedDraft {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as SavedDraft).text === 'string' &&
    typeof (value as SavedDraft).savedAt === 'number'
  )
}

function load(): Record<string, SavedDraft> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    const cutoff = Date.now() - MAX_AGE_MS
    return Object.fromEntries(
      Object.entries(parsed && typeof parsed === 'object' ? parsed : {}).filter(
        (entry): entry is [string, SavedDraft] =>
          isSavedDraft(entry[1]) && entry[1].savedAt >= cutoff
      )
    )
  } catch {
    return {}
  }
}

function save(next: Record<string, SavedDraft>): void {
  const newest = Object.entries(next)
    .sort((a, b) => b[1].savedAt - a[1].savedAt)
    .slice(0, MAX_DRAFTS)
  drafts = Object.fromEntries(newest)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts))
  } catch {
    // Why ignored: a full or blocked storage only costs the draft surviving a restart.
  }
  for (const listener of listeners) {
    listener()
  }
}

function setSavedDraft(key: string, text: string): void {
  const { [key]: _previous, ...rest } = drafts
  save(text ? { ...rest, [key]: { text, savedAt: Date.now() } } : rest)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Fork: a reply box's text, kept across closing the box and restarting Orca until it is emptied
 * (sending clears it). Without a key it is plain component state.
 */
export function useSavedDraft(key: string | null): [string, (text: string) => void] {
  const [local, setLocal] = useState('')
  const saved = useSyncExternalStore(subscribe, () => (key ? (drafts[key]?.text ?? '') : ''))
  const set = useCallback(
    (text: string) => (key ? setSavedDraft(key, text) : setLocal(text)),
    [key]
  )
  return [key ? saved : local, set]
}

export function issueCommentDraftKey(
  repoPath: string,
  prRepo: { owner: string; repo: string } | null | undefined,
  number: number
): string {
  return `comment:${repoPath}:${prRepo ? `${prRepo.owner}/${prRepo.repo}` : ''}:${number}`
}

export function commentReplyDraftKey(commentId: string | number): string {
  return `reply:${commentId}`
}

export function reloadSavedDraftsForTests(): void {
  drafts = load()
}
