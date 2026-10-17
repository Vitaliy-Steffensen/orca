import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import {
  FAILURE_TOAST_COOLDOWN_MS,
  forgetLanguageServerFailures,
  reportLanguageServerFailure
} from './language-server-failure-toast'

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

const pyrefly = { language: 'python' as const, server: 'pyrefly' }
const errored = vi.mocked(toast.error)

describe('reportLanguageServerFailure', () => {
  beforeEach(() => {
    errored.mockClear()
    forgetLanguageServerFailures()
  })

  it('names the server and what went wrong', () => {
    reportLanguageServerFailure(pyrefly, 'spawn pyrefly ENOENT', 0)
    expect(errored).toHaveBeenCalledTimes(1)
    expect(errored.mock.calls[0]?.[0]).toContain('pyrefly is unavailable (spawn pyrefly ENOENT)')
  })

  it('stays quiet while the same failure repeats, then speaks again after the cooldown', () => {
    reportLanguageServerFailure(pyrefly, 'gone', 0)
    reportLanguageServerFailure(pyrefly, 'gone', FAILURE_TOAST_COOLDOWN_MS - 1)
    expect(errored).toHaveBeenCalledTimes(1)
    reportLanguageServerFailure(pyrefly, 'gone', FAILURE_TOAST_COOLDOWN_MS)
    expect(errored).toHaveBeenCalledTimes(2)
  })

  it('reports a different server or a different error right away', () => {
    reportLanguageServerFailure(pyrefly, 'gone', 0)
    reportLanguageServerFailure({ ...pyrefly, server: 'ty' }, 'gone', 0)
    reportLanguageServerFailure(pyrefly, 'other', 0)
    expect(errored).toHaveBeenCalledTimes(3)
  })

  it('forgets only the languages it is given, so a restart reports the next failure', () => {
    reportLanguageServerFailure(pyrefly, 'gone', 0)
    reportLanguageServerFailure({ language: 'typescript', server: 'tsgo' }, 'gone', 0)
    forgetLanguageServerFailures(['python'])
    reportLanguageServerFailure({ language: 'typescript', server: 'tsgo' }, 'gone', 1)
    expect(errored).toHaveBeenCalledTimes(2)
    reportLanguageServerFailure(pyrefly, 'gone', 1)
    expect(errored).toHaveBeenCalledTimes(3)
  })
})
