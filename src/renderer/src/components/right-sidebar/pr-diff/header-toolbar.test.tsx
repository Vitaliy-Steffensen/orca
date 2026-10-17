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

const VIEW_MODE_PROPS = {
  viewMode: 'list',
  viewModeToggleDisabled: false,
  onToggleViewMode: () => undefined
} as const

describe('PrDiffHeaderToolbar', () => {
  it('names the compare base without its ref namespace', () => {
    render(
      <PrDiffHeaderToolbar
        compareBaseRef="refs/remotes/origin/main"
        findExpanded={false}
        onToggleFind={vi.fn()}
        hasQuery={false}
        {...VIEW_MODE_PROPS}
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
        {...VIEW_MODE_PROPS}
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
        {...VIEW_MODE_PROPS}
      />
    )
    const button = screen.getByTestId('pr-diff-filter-toggle')
    expect(button).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(button)
    expect(onToggleFind).toHaveBeenCalledTimes(1)
  })

  it('switches between list and tree', () => {
    const onToggleViewMode = vi.fn()
    render(
      <PrDiffHeaderToolbar
        compareBaseRef="origin/main"
        findExpanded={false}
        onToggleFind={vi.fn()}
        hasQuery={false}
        viewMode="list"
        viewModeToggleDisabled={false}
        onToggleViewMode={onToggleViewMode}
      />
    )
    const button = screen.getByTestId('pr-diff-view-mode-toggle')
    expect(button).toHaveAttribute('aria-label', 'View as tree')
    fireEvent.click(button)
    expect(onToggleViewMode).toHaveBeenCalledTimes(1)
  })

  it('offers the list switch while in tree mode', () => {
    render(
      <PrDiffHeaderToolbar
        compareBaseRef="origin/main"
        findExpanded={false}
        onToggleFind={vi.fn()}
        hasQuery={false}
        viewMode="tree"
        viewModeToggleDisabled={false}
        onToggleViewMode={vi.fn()}
      />
    )
    expect(screen.getByTestId('pr-diff-view-mode-toggle')).toHaveAttribute(
      'aria-label',
      'View as list'
    )
  })
})
