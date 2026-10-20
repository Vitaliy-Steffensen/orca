import { afterEach, describe, expect, it, vi } from 'vitest'
import { announceActiveWorktreeToCompanion } from './companion-worktree-follow'

describe('announceActiveWorktreeToCompanion', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('asks the host to navigate only the companion window', () => {
    const call = vi.fn(async () => ({ ok: true, result: {} }))
    vi.stubGlobal('window', { api: { runtime: { call } } })

    announceActiveWorktreeToCompanion('repo-1::/wt')

    expect(call).toHaveBeenCalledWith({
      method: 'worktree.activate',
      params: expect.objectContaining({
        worktree: 'id:repo-1::/wt',
        navigation: 'companion',
        notifyClients: false
      })
    })
  })

  it('swallows a failed announcement', async () => {
    const call = vi.fn(async () => {
      throw new Error('offline')
    })
    vi.stubGlobal('window', { api: { runtime: { call } } })

    expect(() => announceActiveWorktreeToCompanion('repo-1::/wt')).not.toThrow()
    await Promise.resolve()
  })
})
