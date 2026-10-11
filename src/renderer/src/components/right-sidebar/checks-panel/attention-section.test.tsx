// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PrAttentionSection } from './attention-section'

afterEach(cleanup)

describe('PrAttentionSection', () => {
  it('heads the triage strip and conflicts with the shared section header, and collapses them', () => {
    render(
      <PrAttentionSection>
        <div>1 failing check</div>
      </PrAttentionSection>
    )
    const heading = screen.getByRole('button', { name: /Needs attention/ })
    expect(screen.getByText('1 failing check')).toBeTruthy()
    fireEvent.click(heading)
    expect(screen.queryByText('1 failing check')).toBeNull()
  })
})
