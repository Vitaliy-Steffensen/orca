import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LanguageServerRequest } from '../../../shared/language-server'

const callRuntimeRpc = vi.hoisted(() => vi.fn())
vi.mock('@/runtime/runtime-rpc-client', () => ({ callRuntimeRpc }))
import {
  askLanguageServer,
  stopLanguageServers,
  stopWorktreeLanguageServers
} from './language-server-client'

const hover = vi.fn()
const stop = vi.fn()
const stopWorktree = vi.fn()

const request: LanguageServerRequest = {
  language: 'python',
  server: 'pyrefly',
  command: null,
  filePath: '/wt/a.py',
  worktreeRoot: '/wt',
  repoRoot: '/repo',
  venvSetting: null,
  text: 'import os\n',
  line: 0,
  character: 8
}

beforeEach(() => {
  callRuntimeRpc.mockReset()
  hover.mockReset()
  stop.mockReset().mockResolvedValue(undefined)
  stopWorktree.mockReset().mockResolvedValue(undefined)
  vi.stubGlobal('window', { api: { languageServer: { hover, stop, stopWorktree } } })
})

describe('askLanguageServer', () => {
  it('asks this app over IPC for a checkout on this machine', async () => {
    hover.mockResolvedValue({ ok: true, markdown: '# os' })

    expect(await askLanguageServer({ kind: 'local' }, 'hover', request)).toEqual({
      ok: true,
      markdown: '# os'
    })
    expect(hover).toHaveBeenCalledWith(request)
    expect(callRuntimeRpc).not.toHaveBeenCalled()
  })

  it('asks the runtime that holds the files, which is what a companion window sees', async () => {
    callRuntimeRpc.mockResolvedValue({ ok: true, markdown: '# os' })
    const target = { kind: 'environment', environmentId: 'env-7' } as const

    expect(await askLanguageServer(target, 'hover', request)).toEqual({
      ok: true,
      markdown: '# os'
    })
    expect(callRuntimeRpc).toHaveBeenCalledWith(target, 'languageServer.hover', request)
    expect(hover).not.toHaveBeenCalled()
  })

  it('stays quiet on a host that predates the method, or has no bridge at all', async () => {
    callRuntimeRpc.mockRejectedValue(
      Object.assign(new Error('unknown method'), { code: 'method_not_found' })
    )
    hover.mockResolvedValue(undefined)

    expect(
      await askLanguageServer({ kind: 'environment', environmentId: 'env-7' }, 'hover', request)
    ).toEqual({ ok: true, markdown: null })
    expect(await askLanguageServer({ kind: 'local' }, 'hover', request)).toEqual({
      ok: true,
      markdown: null
    })
  })

  it('reports any other failure so the editor can say why', async () => {
    callRuntimeRpc.mockRejectedValue(new Error('Runtime connection lost'))

    expect(
      await askLanguageServer({ kind: 'environment', environmentId: 'env-7' }, 'hover', request)
    ).toEqual({ ok: false, error: 'Runtime connection lost' })
  })
})

describe('stopping servers', () => {
  it('stops a language on every host asked since start', async () => {
    callRuntimeRpc.mockResolvedValue({ ok: true, markdown: null })
    hover.mockResolvedValue({ ok: true, markdown: null })
    await askLanguageServer({ kind: 'environment', environmentId: 'env-7' }, 'hover', request)
    await askLanguageServer({ kind: 'local' }, 'hover', request)
    callRuntimeRpc.mockClear()

    await stopLanguageServers('python')

    expect(callRuntimeRpc).toHaveBeenCalledWith(
      { kind: 'environment', environmentId: 'env-7' },
      'languageServer.stop',
      { language: 'python' }
    )
    expect(stop).toHaveBeenCalledWith({ language: 'python' })
  })

  it('releases a checkout on the host that holds it', async () => {
    await stopWorktreeLanguageServers({ kind: 'environment', environmentId: 'env-7' }, '/host/wt')
    await stopWorktreeLanguageServers({ kind: 'local' }, '/wt')

    expect(callRuntimeRpc).toHaveBeenCalledWith(
      { kind: 'environment', environmentId: 'env-7' },
      'languageServer.stopWorktree',
      { worktreeRoot: '/host/wt' }
    )
    expect(stopWorktree).toHaveBeenCalledWith({ worktreeRoot: '/wt' })
  })
})
