import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const callMock = vi.fn()

vi.mock('../runtime-client', () => {
  class RuntimeClient {
    readonly isRemote = false
    call = callMock
    getCliStatus = vi.fn()
    openOrca = vi.fn()
  }

  class RuntimeClientError extends Error {
    readonly code: string

    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  }

  class RuntimeRpcFailureError extends RuntimeClientError {
    readonly response: unknown

    constructor(response: unknown) {
      super('runtime_error', 'runtime_error')
      this.response = response
    }
  }

  return { RuntimeClient, RuntimeClientError, RuntimeRpcFailureError }
})

import { main } from '../index'
import { buildWorktree, okFixture, queueFixtures, worktreeListFixture } from '../test-fixtures'

const WORKTREE = buildWorktree('/tmp/repo', 'feature')
const SELECTOR = 'id:repo::/tmp/repo'

describe('orca review CLI handlers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    callMock.mockReset()
    process.exitCode = undefined
    vi.stubEnv('CLAUDECODE', '')
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('stages a comment on a line range of a file in the current worktree', async () => {
    vi.stubEnv('CLAUDECODE', '1')
    queueFixtures(
      callMock,
      worktreeListFixture([WORKTREE]),
      okFixture('req_show', { worktree: WORKTREE }),
      okFixture('req_add', {
        comment: { id: 'draft-1', path: 'src/App.tsx', startLine: 40, line: 48 },
        pendingCount: 3
      })
    )

    await main(
      [
        'review',
        'comment',
        'add',
        '--file',
        'App.tsx',
        '--line',
        '40',
        '--end-line',
        '48',
        '--body',
        'This retry loop never backs off.'
      ],
      '/tmp/repo/src'
    )

    expect(callMock).toHaveBeenLastCalledWith('reviewComment.add', {
      worktree: SELECTOR,
      path: 'src/App.tsx',
      startLine: 40,
      line: 48,
      body: 'This retry loop never backs off.',
      agent: 'Claude Code'
    })
    expect(vi.mocked(console.log).mock.calls[0][0]).toBe(
      'Staged review comment draft-1 on src/App.tsx:40-48 (3 waiting to be submitted).'
    )
    expect(process.exitCode).toBeUndefined()
  })

  it('turns a typed \\n in the body into a line break, the way agents pass paragraphs', async () => {
    queueFixtures(
      callMock,
      worktreeListFixture([WORKTREE]),
      okFixture('req_show', { worktree: WORKTREE }),
      okFixture('req_add', {
        comment: { id: 'draft-2', path: 'README.md', line: 3 },
        pendingCount: 1
      })
    )

    await main(
      [
        'review',
        'comment',
        'add',
        '--file',
        'README.md',
        '--line',
        '3',
        '--body',
        'Lead.\\n\\n- One\\n- Two',
        '--agent',
        'Codex'
      ],
      '/tmp/repo'
    )

    expect(callMock).toHaveBeenLastCalledWith('reviewComment.add', {
      worktree: SELECTOR,
      path: 'README.md',
      line: 3,
      body: 'Lead.\n\n- One\n- Two',
      agent: 'Codex'
    })
  })

  it('lists staged comments, naming the agent that staged each one', async () => {
    queueFixtures(
      callMock,
      worktreeListFixture([WORKTREE]),
      okFixture('req_list', {
        comments: [
          {
            id: 'draft-1',
            path: 'src/App.tsx',
            line: 12,
            body: 'Missing backoff',
            createdAt: 1,
            agentAuthor: { kind: 'agent', name: 'Codex' }
          }
        ]
      })
    )

    await main(['review', 'comment', 'list'], '/tmp/repo')

    expect(vi.mocked(console.log).mock.calls[0][0]).toBe(
      'Staged review comments (1)\ndraft-1  src/App.tsx:12  [Codex] Missing backoff'
    )
  })

  it('reports a comment that is not in the queue as missing', async () => {
    queueFixtures(
      callMock,
      worktreeListFixture([WORKTREE]),
      okFixture('req_rm', { removed: false })
    )

    await main(['review', 'comment', 'rm', '--id', 'nope'], '/tmp/repo')

    expect(process.exitCode).toBe(1)
  })

  it('clears the review summary when the body is empty', async () => {
    queueFixtures(callMock, worktreeListFixture([WORKTREE]), okFixture('req_summary', { body: '' }))

    await main(['review', 'summary', 'set', '--body', ''], '/tmp/repo')

    expect(callMock).toHaveBeenLastCalledWith('reviewSummary.set', {
      worktree: SELECTOR,
      body: ''
    })
    expect(vi.mocked(console.log).mock.calls[0][0]).toBe('Cleared the review summary.')
  })
})
