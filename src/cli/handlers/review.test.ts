import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
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
      'Proposed review comment draft-1 on src/App.tsx:40-48 (3 waiting for the user to accept).'
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
      'Staged review comments (1)\ndraft-1  accepted  src/App.tsx:12  [Codex] Missing backoff'
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

  it('prints the summary already on the review, so a pass can read before it overwrites', async () => {
    queueFixtures(
      callMock,
      worktreeListFixture([WORKTREE]),
      okFixture('req_summary_get', { body: 'Half a sentence the user typed.' })
    )

    await main(['review', 'summary', 'show'], '/tmp/repo')

    expect(callMock).toHaveBeenLastCalledWith('reviewSummary.get', { worktree: SELECTOR })
    expect(vi.mocked(console.log).mock.calls[0][0]).toBe('Half a sentence the user typed.')
  })

  it('says so plainly when the summary box is empty', async () => {
    queueFixtures(
      callMock,
      worktreeListFixture([WORKTREE]),
      okFixture('req_summary_get', { body: '' })
    )

    await main(['review', 'summary', 'show'], '/tmp/repo')

    expect(vi.mocked(console.log).mock.calls[0][0]).toBe('The review summary is empty.')
  })

  it('uploads a screenshot as base64 and prints the link to embed', async () => {
    const file = path.join(await mkdtemp(path.join(tmpdir(), 'orca-review-asset-')), 'shot.png')
    await writeFile(file, Buffer.from([1, 2, 3, 4]))
    queueFixtures(
      callMock,
      worktreeListFixture([WORKTREE]),
      okFixture('req_asset', {
        url: 'https://github.com/user-attachments/assets/0b1b4d3a-1111-2222-3333-444455556666',
        kind: 'image'
      })
    )

    await main(['review', 'asset', 'upload', '--file', file], '/tmp/repo')

    expect(callMock).toHaveBeenLastCalledWith('reviewAsset.upload', {
      worktree: SELECTOR,
      name: 'shot.png',
      contentType: 'image/png',
      base64: Buffer.from([1, 2, 3, 4]).toString('base64')
    })
    expect(vi.mocked(console.log).mock.calls[0][0]).toBe(
      'https://github.com/user-attachments/assets/0b1b4d3a-1111-2222-3333-444455556666'
    )
  })

  it('refuses a file type GitHub does not attach, before any round trip', async () => {
    queueFixtures(callMock, worktreeListFixture([WORKTREE]))

    await main(['review', 'asset', 'upload', '--file', 'notes.txt'], '/tmp/repo')

    expect(process.exitCode).toBe(1)
    expect(callMock).not.toHaveBeenCalledWith('reviewAsset.upload', expect.anything())
  })

  it('refuses a file that is not there', async () => {
    queueFixtures(callMock, worktreeListFixture([WORKTREE]))

    await main(
      ['review', 'asset', 'upload', '--file', path.join(tmpdir(), 'orca-missing-shot.png')],
      '/tmp/repo'
    )

    expect(process.exitCode).toBe(1)
    expect(callMock).not.toHaveBeenCalledWith('reviewAsset.upload', expect.anything())
  })
})
