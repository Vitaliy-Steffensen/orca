// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PendingReviewDiffBaseToggle } from './pending-review-diff-base-toggle'

afterEach(cleanup)

describe('PendingReviewDiffBaseToggle', () => {
  it('switches between the full PR and since the last review', () => {
    const onChange = vi.fn()
    render(
      <PendingReviewDiffBaseToggle
        value="whole"
        onChange={onChange}
        latestReviewOrdinal={2}
        sinceReviewDisabled={false}
      />
    )
    fireEvent.click(screen.getByRole('radio', { name: /Since review 2/ }))
    expect(onChange).toHaveBeenCalledWith('since-review')
  })

  it('disables since-review when the reviewed commit is gone', () => {
    render(
      <PendingReviewDiffBaseToggle
        value="whole"
        onChange={vi.fn()}
        latestReviewOrdinal={1}
        sinceReviewDisabled
      />
    )
    expect(screen.getByRole('radio', { name: /Since review 1/ })).toHaveProperty('disabled', true)
  })
})
