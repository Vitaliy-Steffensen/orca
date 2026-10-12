// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DiffCommentCard } from './DiffCommentCard'

afterEach(cleanup)

const BODY = 'Dedupe by exact `value` string.\n\n- Weak point: no unit test.\n- Cap at the limit.'

function renderCard(agentName?: string) {
  return render(
    <TooltipProvider>
      <DiffCommentCard lineNumber={3} body={BODY} agentName={agentName} />
    </TooltipProvider>
  )
}

describe('DiffCommentCard agent notes', () => {
  it('reads an agent note as markdown: paragraphs, lists and code', () => {
    const { container } = renderCard('Claude Code')
    expect(container.querySelector('.orca-diff-comment-body code')?.textContent).toBe('value')
    expect(container.querySelectorAll('.orca-diff-comment-body li')).toHaveLength(2)
    expect(container.querySelector('.orca-diff-comment-body')?.textContent).not.toContain('`')
  })

  it("keeps the user's own notes as the text they typed", () => {
    const { container } = renderCard()
    expect(container.querySelector('.orca-diff-comment-body code')).toBeNull()
    expect(container.querySelector('.orca-diff-comment-body')?.textContent).toBe(BODY)
  })
})
