import { describe, expect, it, vi } from 'vitest'
import { languageServerForMonacoLanguage, restartLanguageServers } from './restart-language-servers'

describe('languageServerForMonacoLanguage', () => {
  it("finds the server for an editor's language", () => {
    expect(languageServerForMonacoLanguage('javascript')).toBe('typescript')
    expect(languageServerForMonacoLanguage('python')).toBe('python')
    expect(languageServerForMonacoLanguage('markdown')).toBeNull()
  })
})

describe('restartLanguageServers', () => {
  it('stops each server so the next request starts it fresh, then says so', async () => {
    const stop = vi.fn(async () => undefined)
    const notify = { success: vi.fn(), error: vi.fn() }
    await restartLanguageServers(['python', 'typescript'], { stop, notify })
    expect(stop.mock.calls).toEqual([[{ language: 'python' }], [{ language: 'typescript' }]])
    expect(notify.success).toHaveBeenCalledTimes(1)
    expect(notify.error).not.toHaveBeenCalled()
  })

  it('reports a server that could not be stopped', async () => {
    const stop = vi.fn(async () => {
      throw new Error('gone')
    })
    const notify = { success: vi.fn(), error: vi.fn() }
    await restartLanguageServers(['python'], { stop, notify })
    expect(notify.error).toHaveBeenCalledTimes(1)
    expect(notify.success).not.toHaveBeenCalled()
  })
})
