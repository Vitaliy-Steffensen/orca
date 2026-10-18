import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import {
  EMPTY_VIEWED_FILES_STATE,
  normalizeViewedFilesByWorkspace,
  type ViewedFilesByWorkspace,
  type ViewedFilesState
} from '../../shared/diff-review-identity'

/** A missing or unreadable file is empty, never an error the reviewer has to clear. */
async function readViewedFile(file: string): Promise<ViewedFilesByWorkspace> {
  try {
    return normalizeViewedFilesByWorkspace(JSON.parse(await readFile(file, 'utf8')))
  } catch {
    return { version: 1, byWorkspace: {} }
  }
}

export async function readViewedFiles(file: string, worktreeId: string): Promise<ViewedFilesState> {
  return (await readViewedFile(file)).byWorkspace[worktreeId] ?? EMPTY_VIEWED_FILES_STATE
}

let queue: Promise<unknown> = Promise.resolve()

/**
 * Why serialized: every write is a read-modify-write of the whole file, and two edits landing
 * together would otherwise each write back the other's stale copy. Why a rename: a crash mid-write
 * must leave the previous file, not half of the new one.
 */
export function writeViewedFiles(
  file: string,
  worktreeId: string,
  state: ViewedFilesState
): Promise<void> {
  const run = queue.then(async () => {
    const current = await readViewedFile(file)
    const normalized = normalizeViewedFilesByWorkspace({
      version: 1,
      byWorkspace: { ...current.byWorkspace, [worktreeId]: state }
    })
    await mkdir(dirname(file), { recursive: true })
    const temp = `${file}.${process.pid}.tmp`
    await writeFile(temp, JSON.stringify(normalized), 'utf8')
    await rename(temp, file)
  })
  queue = run.catch(() => undefined)
  return run
}
