import '../unused-default-rpc-methods.test-fixture'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrcaRuntimeService } from '../../orca-runtime'
import { RpcDispatcher } from '../dispatcher'

const host = {
  definition: vi.fn(),
  hover: vi.fn(),
  references: vi.fn(),
  stopLanguage: vi.fn(),
  stopWorktree: vi.fn()
}

vi.mock('../../../language-server/language-server-host', () => ({
  languageServerHost: () => host
}))

const { LANGUAGE_SERVER_METHODS } = await import('./language-server')

function dispatch(method: string, params: Record<string, unknown>, clientKind?: 'runtime') {
  const dispatcher = new RpcDispatcher({
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: these handlers never touch the runtime; only the envelope's runtime id is read.
    runtime: { getRuntimeId: () => 'test-runtime' } as unknown as OrcaRuntimeService,
    methods: LANGUAGE_SERVER_METHODS
  })
  return dispatcher.dispatch(
    { id: 'req-1', authToken: 'tok', method, params },
    clientKind ? { clientKind } : undefined
  )
}

const ask = {
  language: 'python',
  server: 'pyrefly',
  command: '  apps/backend/.venv/bin/pyrefly  ',
  filePath: '/work/tree/apps/backend/a.py',
  worktreeRoot: '/work/tree',
  repoRoot: '',
  text: 'import os\n',
  line: 0,
  character: 8
}

describe('languageServer RPC methods', () => {
  beforeEach(() => {
    for (const fn of Object.values(host)) {
      fn.mockReset()
    }
  })

  it('hands the host a normalized request', async () => {
    host.hover.mockResolvedValue({ ok: true, markdown: '# os' })

    const response = await dispatch('languageServer.hover', ask)

    expect(response).toMatchObject({ ok: true, result: { ok: true, markdown: '# os' } })
    expect(host.hover).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'apps/backend/.venv/bin/pyrefly',
        repoRoot: null,
        venvSetting: null
      })
    )
  })

  it('refuses a language this build has no server for', async () => {
    const response = await dispatch('languageServer.hover', { ...ask, language: 'cobol' })

    expect(response.ok).toBe(false)
    expect(host.hover).not.toHaveBeenCalled()
  })

  it('carries the failure the host reports', async () => {
    host.definition.mockResolvedValue({ ok: false, error: 'pyrefly is not at /nope/pyrefly' })

    const response = await dispatch('languageServer.definition', ask)

    expect(response).toMatchObject({
      ok: true,
      result: { ok: false, error: 'pyrefly is not at /nope/pyrefly' }
    })
  })

  it('drops reference texts too large for a remote reply, keeping the locations', async () => {
    const locations = [{ filePath: '/work/tree/b.py', line: 1, character: 0 }]
    host.references.mockResolvedValue({
      ok: true,
      locations,
      files: { '/work/tree/b.py': 'x'.repeat(80 * 1024 * 1024) }
    })

    const response = await dispatch('languageServer.references', ask, 'runtime')

    expect(response).toMatchObject({ ok: true, result: { ok: true, locations, files: {} } })
  })

  it('keeps reference texts for this window', async () => {
    const files = { '/work/tree/b.py': 'x'.repeat(80 * 1024 * 1024) }
    host.references.mockResolvedValue({ ok: true, locations: [], files })

    const response = await dispatch('languageServer.references', ask)

    expect(response).toMatchObject({ ok: true, result: { files } })
  })

  it('stops a language and a checkout', async () => {
    await dispatch('languageServer.stop', { language: 'typescript' })
    await dispatch('languageServer.stopWorktree', { worktreeRoot: '/work/tree' })

    expect(host.stopLanguage).toHaveBeenCalledWith('typescript')
    expect(host.stopWorktree).toHaveBeenCalledWith('/work/tree')
  })
})
