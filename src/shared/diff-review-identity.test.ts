import { describe, expect, it } from 'vitest'
import {
  EMPTY_VIEWED_FILES_STATE,
  buildChangedFileIdentity,
  clearFileViewed,
  didFileChangeSinceViewed,
  isFileViewed,
  markFileViewed,
  normalizeViewedFilesByWorkspace,
  normalizeViewedFilesState
} from './diff-review-identity'
import type { GitBranchChangeEntry } from './git-diff-compare-types'

const entry = (overrides: Partial<GitBranchChangeEntry> = {}): GitBranchChangeEntry => ({
  path: 'src/a.ts',
  status: 'modified',
  baseOid: 'a'.repeat(40),
  headOid: 'b'.repeat(40),
  added: 3,
  removed: 1,
  ...overrides
})

describe('changed file identity', () => {
  it('is unchanged by a commit that did not touch the file', () => {
    // A new commit moves HEAD, but this file's blobs on both sides are the same objects.
    const before = buildChangedFileIdentity(entry())
    const after = buildChangedFileIdentity(entry())
    expect(after).toBe(before)
  })

  it('changes only for the file whose content moved', () => {
    const untouched = buildChangedFileIdentity(entry({ path: 'src/b.ts' }))
    const edited = buildChangedFileIdentity(entry())
    const editedAgain = buildChangedFileIdentity(entry({ headOid: 'c'.repeat(40) }))
    expect(editedAgain).not.toBe(edited)
    expect(buildChangedFileIdentity(entry({ path: 'src/b.ts' }))).toBe(untouched)
  })

  it('moves when the base side is rewritten, as a rebase or a pull does', () => {
    expect(buildChangedFileIdentity(entry({ baseOid: 'f'.repeat(40) }))).not.toBe(
      buildChangedFileIdentity(entry())
    )
  })

  it('moves when a change is staged on top of the committed version', () => {
    expect(buildChangedFileIdentity(entry({ indexOid: 'd'.repeat(40) }))).not.toBe(
      buildChangedFileIdentity(entry())
    )
  })

  it('still distinguishes versions on a host that sends no oids', () => {
    const old = entry({ baseOid: undefined, headOid: undefined })
    expect(buildChangedFileIdentity(old)).toBe(
      buildChangedFileIdentity(entry({ baseOid: undefined, headOid: undefined }))
    )
    // Line counts are measured against the base, so they survive a commit but move on an edit.
    expect(buildChangedFileIdentity({ ...old, added: 4 })).not.toBe(buildChangedFileIdentity(old))
  })

  it('separates a rename from a plain edit of the same path', () => {
    expect(buildChangedFileIdentity(entry({ status: 'renamed', oldPath: 'src/old.ts' }))).not.toBe(
      buildChangedFileIdentity(entry())
    )
  })
})

describe('viewed files', () => {
  const identity = buildChangedFileIdentity(entry())

  it('reads as viewed only while the file is the version that was ticked', () => {
    const state = markFileViewed(EMPTY_VIEWED_FILES_STATE, 'src/a.ts', identity, 10)
    expect(isFileViewed(state.files['src/a.ts'], identity)).toBe(true)
    expect(didFileChangeSinceViewed(state.files['src/a.ts'], identity)).toBe(false)

    const moved = buildChangedFileIdentity(entry({ headOid: 'c'.repeat(40) }))
    // No write happens: the same stored record simply stops matching.
    expect(isFileViewed(state.files['src/a.ts'], moved)).toBe(false)
    expect(didFileChangeSinceViewed(state.files['src/a.ts'], moved)).toBe(true)
  })

  it('reports nothing for a file that was never ticked', () => {
    expect(isFileViewed(undefined, identity)).toBe(false)
    expect(didFileChangeSinceViewed(undefined, identity)).toBe(false)
  })

  it('unticking forgets the file rather than remembering a stale version', () => {
    const state = markFileViewed(EMPTY_VIEWED_FILES_STATE, 'src/a.ts', identity, 10)
    expect(clearFileViewed(state, 'src/a.ts', 20).files).toEqual({})
    expect(clearFileViewed(state, 'src/missing.ts', 20)).toBe(state)
  })
})

describe('normalization', () => {
  it('treats a missing, corrupt or partial file as nothing ticked', () => {
    expect(normalizeViewedFilesState(undefined)).toEqual(EMPTY_VIEWED_FILES_STATE)
    expect(normalizeViewedFilesState({ files: 'nope' })).toEqual(EMPTY_VIEWED_FILES_STATE)
    expect(
      normalizeViewedFilesState({
        files: {
          good: { viewedAt: 1, viewedIdentity: 'd1' },
          missingIdentity: { viewedAt: 2 },
          emptyIdentity: { viewedAt: 3, viewedIdentity: '' },
          '': { viewedAt: 4, viewedIdentity: 'd2' }
        }
      }).files
    ).toEqual({ good: { viewedAt: 1, viewedIdentity: 'd1' } })
  })

  it('drops workspaces with nothing ticked so the file does not grow forever', () => {
    expect(
      normalizeViewedFilesByWorkspace({
        byWorkspace: {
          kept: { files: { 'a.ts': { viewedAt: 1, viewedIdentity: 'd1' } } },
          emptied: { files: {} }
        }
      })
    ).toEqual({
      version: 1,
      byWorkspace: {
        kept: { version: 1, files: { 'a.ts': { viewedAt: 1, viewedIdentity: 'd1' } } }
      }
    })
    expect(normalizeViewedFilesByWorkspace(null)).toEqual({ version: 1, byWorkspace: {} })
  })
})
