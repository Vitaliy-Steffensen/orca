// @vitest-environment happy-dom

// A waiting plan is transcript content, not a card: the composer carries the decision, so the
// transcript has to show what is being decided.

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NativeChatResolutionReceipt } from './NativeChatResolutionReceipt'
import type { NativeChatResolvedPrompt } from './native-chat-resolution-receipt'

vi.mock('./NativeChatMarkdown', () => ({
  NativeChatMarkdown: ({ content }: { content: string }) => (
    <div data-testid="markdown">{content}</div>
  )
}))
vi.mock('./NativeChatCodeBlock', () => ({ NativeChatCodeBlock: () => null }))

function pendingApproval(subject?: Record<string, unknown>): NativeChatResolvedPrompt {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the receipt reads kind, subject, title, detail and resolution, all present here.
  return {
    kind: 'approval',
    title: 'Review proposed plan',
    detail: null,
    options: [{ id: 'deny', label: 'Keep planning' }],
    ...(subject ? { subject } : {}),
    resolution: { state: 'pending', selectedOptionId: null, resolvedBy: null, resolvedAt: null }
  } as unknown as NativeChatResolvedPrompt
}

describe('a pending approval in the transcript', () => {
  it('draws the plan itself', () => {
    render(
      <NativeChatResolutionReceipt
        body={pendingApproval({ kind: 'plan', text: '# Ship it' })}
        allowFileUriLinks={false}
      />
    )

    expect(screen.getByTestId('markdown').textContent).toBe('# Ship it')
  })

  it('names the plan file when the agent wrote one', () => {
    render(
      <NativeChatResolutionReceipt
        body={pendingApproval({ kind: 'plan', text: '# Ship it', filePath: '/repo/plan.md' })}
        allowFileUriLinks={false}
      />
    )

    expect(screen.getByText('/repo/plan.md')).toBeTruthy()
  })

  it('stays silent for an approval whose card still owns the slot', () => {
    const { container } = render(
      <NativeChatResolutionReceipt body={pendingApproval()} allowFileUriLinks={false} />
    )

    expect(container.firstChild).toBeNull()
  })
})
