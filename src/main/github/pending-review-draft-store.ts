import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import {
  normalizePendingReviewComments,
  type PendingReviewComment
} from '../../shared/github/pending-review-comment'

export type PendingReviewDrafts = Record<string, PendingReviewComment[]>

/**
 * 2 split the agent's unaccepted proposals out of `drafts` into their own `proposals` key.
 *
 * Why a separate key rather than the comment's own status: a build older than this one reads
 * `drafts` and submits every comment in it, so a proposal left there would reach a public pull
 * request under the reviewer's name without them ever seeing it. It cannot see another key at
 * all. The price is that such a build rewrites the file without `proposals` and the unaccepted
 * ones are lost — losing a local draft beats publishing one.
 */
const FILE_VERSION = 2

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : null
}

type DraftFile = { drafts: PendingReviewDrafts; summaries: Record<string, string> }

function byCreation(a: PendingReviewComment, b: PendingReviewComment): number {
  return a.createdAt - b.createdAt || a.id.localeCompare(b.id)
}

/** A missing or unreadable file is empty, never an error the reviewer has to clear. */
async function readDraftFile(file: string): Promise<DraftFile> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return { drafts: {}, summaries: {} }
  }
  const root = asRecord(parsed)
  const drafts: PendingReviewDrafts = {}
  // A version 1 file kept agent comments in `drafts`; the sanitizer reads them back as proposals.
  for (const key of ['drafts', 'proposals'] as const) {
    for (const [worktreeId, comments] of Object.entries(asRecord(root?.[key]) ?? {})) {
      const normalized = normalizePendingReviewComments(comments)
      if (normalized.length > 0) {
        drafts[worktreeId] = [...(drafts[worktreeId] ?? []), ...normalized].sort(byCreation)
      }
    }
  }
  const summaries: Record<string, string> = {}
  for (const [worktreeId, text] of Object.entries(asRecord(root?.summaries) ?? {})) {
    if (typeof text === 'string' && text.trim()) {
      summaries[worktreeId] = text
    }
  }
  return { drafts, summaries }
}

export async function readPendingReviewDrafts(file: string): Promise<PendingReviewDrafts> {
  return (await readDraftFile(file)).drafts
}

/** Each workspace's unsent review summary, kept beside its queued comments. */
export async function readPendingReviewSummaries(file: string): Promise<Record<string, string>> {
  return (await readDraftFile(file)).summaries
}

/** Splits the in-memory queue back into the accepted `drafts` and the agent's `proposals`. */
function serializeDraftFile(current: DraftFile): unknown {
  const drafts: PendingReviewDrafts = {}
  const proposals: PendingReviewDrafts = {}
  for (const [worktreeId, comments] of Object.entries(current.drafts)) {
    const accepted = comments.filter((comment) => comment.status === 'accepted')
    const proposed = comments.filter((comment) => comment.status === 'proposed')
    if (accepted.length > 0) {
      drafts[worktreeId] = accepted
    }
    if (proposed.length > 0) {
      proposals[worktreeId] = proposed
    }
  }
  return { version: FILE_VERSION, drafts, proposals, summaries: current.summaries }
}

let queue: Promise<unknown> = Promise.resolve()

/**
 * Rewrites the file with one change applied.
 *
 * Why serialized: every write is a read-modify-write of the whole file, and two edits landing
 * together would otherwise each write back the other's stale copy. Why a rename: a crash mid-write
 * must leave the previous file, not half of the new one.
 */
function updateDraftFile(file: string, change: (current: DraftFile) => void): Promise<void> {
  const run = queue.then(async () => {
    const current = await readDraftFile(file)
    change(current)
    await mkdir(dirname(file), { recursive: true })
    const temp = `${file}.${process.pid}.tmp`
    await writeFile(temp, JSON.stringify(serializeDraftFile(current)), 'utf8')
    await rename(temp, file)
  })
  queue = run.catch(() => undefined)
  return run
}

/**
 * Applies a change to one workspace's queue inside the file's own write order, and answers
 * with the queue that was stored.
 *
 * Why read-modify-write here rather than in the caller: two writers — the reviewer's window and
 * an agent staging through the CLI — would otherwise each save a copy taken before the other's.
 */
export function updatePendingReviewDrafts(
  file: string,
  worktreeId: string,
  change: (comments: PendingReviewComment[]) => readonly PendingReviewComment[]
): Promise<PendingReviewComment[]> {
  let next: PendingReviewComment[] = []
  return updateDraftFile(file, ({ drafts }) => {
    next = normalizePendingReviewComments(change(drafts[worktreeId] ?? []))
    if (next.length > 0) {
      drafts[worktreeId] = next
    } else {
      delete drafts[worktreeId]
    }
  }).then(() => next)
}

/** Replaces one workspace's queue on disk. */
export function writePendingReviewDrafts(
  file: string,
  worktreeId: string,
  comments: readonly PendingReviewComment[]
): Promise<void> {
  return updatePendingReviewDrafts(file, worktreeId, () => comments).then(() => undefined)
}

/** Replaces one workspace's unsent review summary on disk; an empty one is removed. */
export function writePendingReviewSummary(
  file: string,
  worktreeId: string,
  text: string
): Promise<void> {
  return updateDraftFile(file, ({ summaries }) => {
    if (text.trim()) {
      summaries[worktreeId] = text
    } else {
      delete summaries[worktreeId]
    }
  })
}
