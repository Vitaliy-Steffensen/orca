// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { PRComment } from '../../../../../shared/github/comment-types'
import { ResolvedCommentsSection } from './resolved-comments-section'

afterEach(cleanup)

function comment(id: number, body: string, isResolved: boolean): PRComment {
  return {
    id,
    author: 'alice',
    authorAvatarUrl: '',
    body,
    createdAt: '2026-05-14T00:00:00Z',
    url: `https://github.com/acme/widgets/pull/42#discussion_r${id}`,
    path: 'a.ts',
    line: id,
    threadId: `T${id}`,
    isResolved
  }
}

function renderSection(comments: PRComment[]) {
  return render(
    <TooltipProvider>
      <ResolvedCommentsSection comments={comments} />
    </TooltipProvider>
  )
}

describe('ResolvedCommentsSection', () => {
  it('heads the resolved threads with the shared section header, closed until opened', () => {
    renderSection([comment(1, 'Still open.', false), comment(2, 'Fixed it.', true)])
    const heading = screen.getByRole('button', { name: /Resolved/ })
    expect(heading.textContent).toContain('1')
    expect(screen.queryByText('Fixed it.')).toBeNull()

    fireEvent.click(heading)
    expect(screen.getByText('Fixed it.')).toBeTruthy()
    expect(screen.queryByText('Still open.')).toBeNull()
  })

  it('is absent while nothing is resolved', () => {
    const { container } = renderSection([comment(1, 'Still open.', false)])
    expect(container.textContent).toBe('')
  })
})
