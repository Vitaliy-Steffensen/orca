import { describe, expect, it, vi, beforeEach } from 'vitest'
import type * as RepoBaseRefSearch from './repo-base-ref-search'

type RepoBaseRefSearchModule = typeof RepoBaseRefSearch

const { listRemoteNamesMock, getBaseRefDefaultMock } = vi.hoisted(() => ({
  listRemoteNamesMock: vi.fn(),
  getBaseRefDefaultMock: vi.fn()
}))

vi.mock('./repo-base-ref-search', async () => {
  const actual = await vi.importActual<RepoBaseRefSearchModule>('./repo-base-ref-search')
  return { ...actual, listRemoteNames: listRemoteNamesMock }
})

vi.mock('./repo-default-base-ref', () => ({ getBaseRefDefault: getBaseRefDefaultMock }))

const { resolveWorktreeCompareBase } = await import('./worktree-compare-base')

describe('resolveWorktreeCompareBase', () => {
  beforeEach(() => {
    listRemoteNamesMock.mockReset().mockResolvedValue(['origin'])
    getBaseRefDefaultMock.mockReset().mockResolvedValue('refs/remotes/origin/main')
  })

  it('keeps a base that is a different branch', async () => {
    await expect(
      resolveWorktreeCompareBase('/repo', 'feature/x', 'refs/remotes/origin/main')
    ).resolves.toBe('refs/remotes/origin/main')
  })

  it('falls back to the repo default when the base is the branch own remote ref', async () => {
    // Why: this is the empty-diff bug — a workspace opened on origin/feature/x
    // recorded origin/feature/x as the ref to diff against.
    await expect(
      resolveWorktreeCompareBase('/repo', 'feature/x', 'refs/remotes/origin/feature/x')
    ).resolves.toBe('refs/remotes/origin/main')
  })

  it('falls back when the base names the local branch itself', async () => {
    await expect(
      resolveWorktreeCompareBase('/repo', 'feature/x', 'refs/heads/feature/x')
    ).resolves.toBe('refs/remotes/origin/main')
  })

  it('does not let a remote whose name prefixes another claim the branch', async () => {
    listRemoteNamesMock.mockResolvedValue(['orig', 'origin'])
    await expect(
      resolveWorktreeCompareBase('/repo', 'in/feature/x', 'refs/remotes/origin/feature/x')
    ).resolves.toBe('refs/remotes/origin/feature/x')
  })

  it('keeps the original base when no default base ref is available', async () => {
    getBaseRefDefaultMock.mockResolvedValue(null)
    await expect(
      resolveWorktreeCompareBase('/repo', 'feature/x', 'refs/remotes/origin/feature/x')
    ).resolves.toBe('refs/remotes/origin/feature/x')
  })
})
