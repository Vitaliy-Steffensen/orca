import '../unused-default-rpc-methods.test-fixture'
import { describe, expect, it, vi } from 'vitest'
import { RpcDispatcher } from '../dispatcher'
import type { RpcRequest } from '../core'
import type { OrcaRuntimeService } from '../../orca-runtime'
import { FILE_METHODS } from './files'

function makeRequest(method: string, params?: unknown): RpcRequest {
  return { id: 'req-1', authToken: 'tok', method, params }
}

describe('files.search path restriction', () => {
  it('searches files for a selected worktree', async () => {
    const runtime = {
      getRuntimeId: () => 'test-runtime',
      searchRuntimeFiles: vi.fn().mockResolvedValue({
        files: [],
        totalMatches: 0,
        truncated: false
      })
    } as unknown as OrcaRuntimeService
    const dispatcher = new RpcDispatcher({ runtime, methods: FILE_METHODS })

    const response = await dispatcher.dispatch(
      makeRequest('files.search', {
        worktree: 'id:wt-1',
        query: 'needle',
        caseSensitive: true,
        maxResults: 50
      })
    )

    expect(runtime.searchRuntimeFiles).toHaveBeenCalledWith(
      'id:wt-1',
      {
        query: 'needle',
        caseSensitive: true,
        wholeWord: undefined,
        useRegex: undefined,
        includePattern: undefined,
        excludePattern: undefined,
        maxResults: 50,
        restrictToPaths: undefined
      },
      { signal: undefined }
    )
    expect(response).toMatchObject({ ok: true, result: { files: [], totalMatches: 0 } })
  })

  it('forwards a changed-file path restriction', async () => {
    const runtime = {
      getRuntimeId: () => 'test-runtime',
      searchRuntimeFiles: vi.fn().mockResolvedValue({
        files: [],
        totalMatches: 0,
        truncated: false
      })
    } as unknown as OrcaRuntimeService
    const dispatcher = new RpcDispatcher({ runtime, methods: FILE_METHODS })

    await dispatcher.dispatch(
      makeRequest('files.search', {
        worktree: 'id:wt-1',
        query: 'needle',
        restrictToPaths: ['src/a.ts', 'src/b.ts']
      })
    )

    expect(runtime.searchRuntimeFiles).toHaveBeenCalledWith(
      'id:wt-1',
      expect.objectContaining({ restrictToPaths: ['src/a.ts', 'src/b.ts'] }),
      { signal: undefined }
    )
  })
})
