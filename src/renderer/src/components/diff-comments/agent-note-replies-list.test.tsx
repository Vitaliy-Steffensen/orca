// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DiffComment } from '../../../../shared/diff-comment-types'
import { NoteThread } from './agent-note-replies-list'

const mocks = vi.hoisted(() => ({ addDiffComment: vi.fn(), sendNotesToBestAgent: vi.fn() }))

vi.mock('@/store', () => ({
  useAppStore: { getState: () => ({ addDiffComment: mocks.addDiffComment }) }
}))
vi.mock('@/lib/send-notes-to-best-agent', () => ({
  sendNotesToBestAgent: mocks.sendNotesToBestAgent
}))

const root: DiffComment = {
  id: 'a1',
  worktreeId: 'wt-1',
  filePath: 'src/a.ts',
  lineNumber: 3,
  body: 'Loaded layers start closed.',
  createdAt: 1,
  side: 'modified',
  agentAuthor: { kind: 'agent', name: 'Codex' }
}

describe('NoteThread reply box', () => {
  let scrollHeight = 40

  beforeEach(() => {
    scrollHeight = 40
    vi.spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get').mockImplementation(
      () => scrollHeight
    )
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('grows with what is typed, up to a cap', () => {
    render(<NoteThread root={root} replies={[]} worktreeId="wt-1" onDelete={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }))
    const textarea = screen.getByPlaceholderText('Ask a follow-up…')

    scrollHeight = 120
    fireEvent.change(textarea, { target: { value: 'line 1\nline 2\nline 3\nline 4' } })
    expect(textarea.style.height).toBe('120px')

    scrollHeight = 900
    fireEvent.change(textarea, { target: { value: 'a very long follow-up' } })
    expect(textarea.style.height).toBe('240px')
  })

  it('sends a submitted follow-up straight to an agent, with the unsent ones before it', async () => {
    const earlier: DiffComment = {
      ...root,
      id: 'u1',
      body: 'Why?',
      agentAuthor: undefined,
      replyToNoteId: 'a1'
    }
    const saved: DiffComment = { ...earlier, id: 'u2', body: 'And the tests?' }
    mocks.addDiffComment.mockResolvedValue(saved)
    render(
      <NoteThread
        root={root}
        replies={[earlier]}
        worktreeId="wt-1"
        groupId="g-1"
        onDelete={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }))
    fireEvent.change(screen.getByPlaceholderText('Ask a follow-up…'), {
      target: { value: 'And the tests?' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add reply' }))

    await vi.waitFor(() =>
      expect(mocks.sendNotesToBestAgent).toHaveBeenCalledWith({
        worktreeId: 'wt-1',
        notes: [earlier, saved],
        groupId: 'g-1'
      })
    )
  })
})
