import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import * as NodeOs from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const home = vi.hoisted(() => ({ path: '' }))

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (key: string) => Buffer.from(`encrypted:${key}`),
    decryptString: (buffer: Buffer) => {
      const value = buffer.toString('utf8')
      if (!value.startsWith('encrypted:')) {
        throw new Error('bad ciphertext')
      }
      return value.slice('encrypted:'.length)
    }
  }
}))

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof NodeOs>()
  return { ...actual, homedir: () => home.path }
})

describe('workspace run credential store', () => {
  beforeEach(() => {
    home.path = mkdtempSync(join(NodeOs.tmpdir(), 'orca-workspace-run-'))
    vi.resetModules()
  })

  afterEach(() => {
    rmSync(home.path, { recursive: true, force: true })
  })

  it('saves, reports, and clears a password without writing it in plaintext', async () => {
    const store = await import('./workspace-run-credential-store')
    const password = 'workspace-run-secret'
    store.setWorkspaceRunPassword('cmd-1', password)
    expect(store.hasWorkspaceRunPassword('cmd-1')).toBe(true)
    expect(store.readWorkspaceRunPassword('cmd-1')).toBe(password)

    const raw = readFileSync(join(home.path, '.orca', 'workspace-run-credentials.json'), 'utf8')
    expect(raw.startsWith('orca-workspace-runencrypted:')).toBe(true)
    expect(raw).not.toContain(password)

    store.clearWorkspaceRunPassword('cmd-1')
    expect(store.hasWorkspaceRunPassword('cmd-1')).toBe(false)
  })
})
