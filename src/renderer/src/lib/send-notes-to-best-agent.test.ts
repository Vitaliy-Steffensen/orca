import { describe, expect, it, vi } from 'vitest'
import type { DiffComment } from '../../../shared/diff-comment-types'
import { sendNotesToBestAgent, type SendNotesToBestAgentDeps } from './send-notes-to-best-agent'

const AGENT_NOTE: DiffComment = {
  id: 'note-1',
  worktreeId: 'wt',
  filePath: 'src/zernio.ts',
  startLine: 15,
  lineNumber: 18,
  body: 'Candidate id is now a bare string.',
  side: 'modified',
  createdAt: 1,
  agentAuthor: { kind: 'agent', name: 'Claude Code' }
}

const FOLLOW_UP: DiffComment = {
  id: 'reply-1',
  worktreeId: 'wt',
  filePath: 'src/zernio.ts',
  startLine: 15,
  lineNumber: 18,
  body: 'Why not keep the branded type?',
  side: 'modified',
  createdAt: 2,
  replyToNoteId: 'note-1'
}

const TARGET = { kind: 'terminal', tabId: 'tab-1', leafId: 'leaf-1' }

function deps(overrides: Partial<SendNotesToBestAgentDeps> = {}): SendNotesToBestAgentDeps {
  return {
    pickTarget: vi.fn(() => ({ messageTarget: TARGET, tabTitle: 'Claude Code' }) as never),
    sendMessage: vi.fn(async () => ({ status: 'sent' as const })),
    defaultAgent: vi.fn(() => 'claude' as const),
    launch: vi.fn(() => ({}) as never),
    earlierInThread: () => () => [AGENT_NOTE],
    clearDelivered: vi.fn(),
    notify: { success: vi.fn(), error: vi.fn() },
    ...overrides
  }
}

describe('sendNotesToBestAgent', () => {
  it("sends the follow-up with its thread's context to the auto-picked agent", async () => {
    const d = deps()
    await expect(sendNotesToBestAgent({ worktreeId: 'wt', notes: [FOLLOW_UP] }, d)).resolves.toBe(
      'sent'
    )

    const { prompt, target } = vi.mocked(d.sendMessage).mock.calls[0][0]
    expect(target).toBe(TARGET)
    expect(prompt).toContain('Why not keep the branded type?')
    expect(prompt).toContain('Candidate id is now a bare string.')
    expect(prompt).toContain('Note id: reply-1')
    expect(d.clearDelivered).toHaveBeenCalledWith('wt', [FOLLOW_UP])
    expect(d.launch).not.toHaveBeenCalled()
  })

  it('starts the default agent with the prompt when none is running', async () => {
    const d = deps({ pickTarget: vi.fn(() => null) })
    await expect(
      sendNotesToBestAgent({ worktreeId: 'wt', notes: [FOLLOW_UP], groupId: 'group-1' }, d)
    ).resolves.toBe('launched')

    const launched = vi.mocked(d.launch).mock.calls[0][0]
    expect(launched).toMatchObject({
      agent: 'claude',
      worktreeId: 'wt',
      groupId: 'group-1',
      promptDelivery: 'submit-after-ready',
      launchSource: 'notes_send'
    })
    expect(launched.prompt).toContain('Why not keep the branded type?')
    expect(d.clearDelivered).not.toHaveBeenCalled()
    launched.onPromptDelivered?.()
    expect(d.clearDelivered).toHaveBeenCalledWith('wt', [FOLLOW_UP])
  })

  it('keeps the follow-up pending and says why when the send fails', async () => {
    const d = deps({
      sendMessage: vi.fn(async () => ({
        status: 'not-ready' as const,
        code: 'terminal_wait_unsatisfied' as const
      }))
    })
    await expect(sendNotesToBestAgent({ worktreeId: 'wt', notes: [FOLLOW_UP] }, d)).resolves.toBe(
      'failed'
    )
    expect(d.clearDelivered).not.toHaveBeenCalled()
    expect(d.notify.error).toHaveBeenCalled()
  })

  it('says so when there is no agent to send to or start', async () => {
    const d = deps({ pickTarget: vi.fn(() => null), defaultAgent: vi.fn(() => null) })
    await expect(sendNotesToBestAgent({ worktreeId: 'wt', notes: [FOLLOW_UP] }, d)).resolves.toBe(
      'no-agent'
    )
    expect(d.notify.error).toHaveBeenCalled()
  })
})
