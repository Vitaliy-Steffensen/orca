import { beforeEach, expect, it, vi } from 'vitest'

const callAbortableRuntimeEnvironment = vi.hoisted(() => vi.fn())
vi.mock('../../runtime/abortable-runtime-environment-call', () => ({
  callAbortableRuntimeEnvironment
}))
vi.mock('./web-runtime-session', () => ({
  requireActiveEnvironment: () => ({ id: 'owning-host' }),
  requireActiveEnvironmentOrNull: () => ({ id: 'owning-host' }),
  getClientForEnvironment: () => null,
  runtimeCallQueuePool: { get: () => null },
  updateEnvironmentFromResponse: () => undefined,
  webRuntimeState: {}
}))
vi.mock('./web-runtime-worktree-catalog', () => ({
  isMissingPathError: () => false,
  resolveRuntimeFilePath: async () => ({ worktree: { id: 'wt-1' }, relativePath: '' })
}))
import { createFileApi } from './web-filesystem-api'

beforeEach(() => {
  callAbortableRuntimeEnvironment.mockReset()
})

// Why this guard: the web shim copies search params field by field, so a new optional
// field is dropped silently — the restriction would become a whole-tree search.
it('forwards the changed-file path restriction over files.search', async () => {
  callAbortableRuntimeEnvironment.mockResolvedValue({
    id: 'rpc-1',
    ok: true,
    result: { files: [], totalMatches: 0, truncated: false }
  })

  await createFileApi().search({
    query: 'needle',
    rootPath: '/repo',
    restrictToPaths: ['src/a.ts']
  })

  expect(callAbortableRuntimeEnvironment).toHaveBeenCalledWith(
    'owning-host',
    'files.search',
    expect.objectContaining({ restrictToPaths: ['src/a.ts'] }),
    15_000,
    expect.any(AbortSignal)
  )
})
