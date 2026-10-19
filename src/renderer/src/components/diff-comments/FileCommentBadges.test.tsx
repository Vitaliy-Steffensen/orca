// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { FileCommentBadges } from './FileCommentBadges'
import type { FileCommentCounts } from './file-comment-counts'

afterEach(cleanup)

function counts(overrides: Partial<FileCommentCounts> = {}): FileCommentCounts {
  return {
    notes: 0,
    agentNotes: 0,
    unresolvedThreads: 0,
    pendingReview: 0,
    ...overrides
  }
}

function kindsRendered(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-file-comment-badge]')).map(
    (node) => node.getAttribute('data-file-comment-badge') ?? ''
  )
}

describe('FileCommentBadges', () => {
  it('renders nothing when the file has no comments, so a tree of zeroes stays quiet', () => {
    const { container } = render(<FileCommentBadges counts={counts()} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing for a file absent from the count map', () => {
    const { container } = render(<FileCommentBadges counts={undefined} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows one badge per non-zero kind and skips the rest', () => {
    const { container } = render(
      <FileCommentBadges counts={counts({ agentNotes: 2, pendingReview: 1 })} />
    )
    expect(kindsRendered(container)).toEqual(['agentNotes', 'pendingReview'])
  })

  it('keeps a stable order so badges line up down a column of rows', () => {
    const { container } = render(
      <FileCommentBadges
        counts={counts({
          notes: 1,
          agentNotes: 1,
          unresolvedThreads: 1,
          pendingReview: 1
        })}
      />
    )
    expect(kindsRendered(container)).toEqual([
      'notes',
      'agentNotes',
      'unresolvedThreads',
      'pendingReview'
    ])
  })

  it('names the kind and its count in the tooltip', () => {
    const { container } = render(<FileCommentBadges counts={counts({ unresolvedThreads: 2 })} />)
    const badge = container.querySelector('[data-file-comment-badge="unresolvedThreads"]')
    expect(badge?.getAttribute('title')).toBe('2 unresolved review threads')
    expect(badge?.textContent).toBe('2')
  })

  it('says "note" rather than "notes" for a single one', () => {
    const { container } = render(<FileCommentBadges counts={counts({ notes: 1 })} />)
    expect(
      container.querySelector('[data-file-comment-badge="notes"]')?.getAttribute('title')
    ).toBe('1 note')
  })
})
