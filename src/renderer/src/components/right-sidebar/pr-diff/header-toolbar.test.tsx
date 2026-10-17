// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PrDiffHeaderToolbar } from './header-toolbar'

vi.mock('@/i18n/i18n', () => ({
  translate: (_key: string, fallback: string, args?: Record<string, unknown>) =>
    fallback.replace(/{{(\w+)}}/g, (_, key: string) => String(args?.[key]))
}))

afterEach(cleanup)

describe('PrDiffHeaderToolbar', () => {
  it('names the compare base without its ref namespace', () => {
    render(
      <PrDiffHeaderToolbar
        compareBaseRef="refs/remotes/origin/main"
        findExpanded={false}
        onToggleFind={vi.fn()}
        hasQuery={false}
      />
    )
    expect(screen.getByText('vs origin/main')).toBeInTheDocument()
  })

  it('falls back to a plain title when there is no base ref', () => {
    render(
      <PrDiffHeaderToolbar
        compareBaseRef={null}
        findExpanded={false}
        onToggleFind={vi.fn()}
        hasQuery={false}
      />
    )
    expect(screen.getByText('Changed files')).toBeInTheDocument()
  })

  it('hosts the find toggle', () => {
    const onToggleFind = vi.fn()
    render(
      <PrDiffHeaderToolbar
        compareBaseRef="origin/main"
        findExpanded
        onToggleFind={onToggleFind}
        hasQuery={false}
      />
    )
    const button = screen.getByTestId('pr-diff-filter-toggle')
    expect(button).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(button)
    expect(onToggleFind).toHaveBeenCalledTimes(1)
  })
})
