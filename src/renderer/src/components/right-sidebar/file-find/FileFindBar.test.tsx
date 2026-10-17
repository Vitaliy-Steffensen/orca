// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FileFindBar, type FileFindBarProps } from './FileFindBar'

vi.mock('@/i18n/i18n', () => ({
  translate: (_key: string, fallback: string, args?: Record<string, unknown>) =>
    fallback.replace(/{{(\w+)}}/g, (_, key: string) => String(args?.[key]))
}))

afterEach(cleanup)

function bar(overrides: Partial<FileFindBarProps> = {}) {
  return render(
    <FileFindBar
      expanded
      onExpandedChange={vi.fn()}
      mode="names"
      onModeChange={vi.fn()}
      query=""
      onQueryChange={vi.fn()}
      onClear={vi.fn()}
      testId="find-input"
      {...overrides}
    />
  )
}

describe('FileFindBar', () => {
  it('renders nothing while collapsed', () => {
    bar({ expanded: false })
    expect(screen.queryByTestId('find-input')).not.toBeInTheDocument()
  })

  it('reports text changes as a plain string', () => {
    const onQueryChange = vi.fn()
    bar({ onQueryChange })
    fireEvent.change(screen.getByTestId('find-input'), { target: { value: 'panel' } })
    expect(onQueryChange).toHaveBeenCalledWith('panel')
  })

  it('focuses and selects the field when it expands', () => {
    bar({ query: 'panel' })
    expect(screen.getByTestId('find-input')).toHaveFocus()
  })

  it('shows the clear button only once there is a query', () => {
    const onClear = vi.fn()
    const view = bar({ onClear })
    expect(screen.queryByLabelText('Clear file filter')).not.toBeInTheDocument()
    view.rerender(
      <FileFindBar
        expanded
        onExpandedChange={vi.fn()}
        mode="names"
        onModeChange={vi.fn()}
        query="panel"
        onQueryChange={vi.fn()}
        onClear={onClear}
        testId="find-input"
      />
    )
    fireEvent.click(screen.getByLabelText('Clear file filter'))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('clears and collapses on Escape', () => {
    const onClear = vi.fn()
    const onExpandedChange = vi.fn()
    bar({ query: 'panel', onClear, onExpandedChange })
    fireEvent.keyDown(screen.getByTestId('find-input'), { key: 'Escape' })
    expect(onClear).toHaveBeenCalledTimes(1)
    expect(onExpandedChange).toHaveBeenCalledWith(false)
  })

  it('leaves keys to the IME while composing', () => {
    const onClear = vi.fn()
    const onKeyDown = vi.fn()
    bar({ query: 'panel', onClear, onKeyDown })
    fireEvent.keyDown(screen.getByTestId('find-input'), { key: 'Escape', isComposing: true })
    expect(onClear).not.toHaveBeenCalled()
    expect(onKeyDown).not.toHaveBeenCalled()
  })

  it('hides the mode switch for views without a content search', () => {
    bar()
    expect(screen.queryByLabelText('Explorer search mode')).not.toBeInTheDocument()
    cleanup()
    bar({ supportsContents: true })
    expect(screen.getByLabelText('Explorer search mode')).toBeInTheDocument()
  })

  it('keeps the explorer key and file-search policy attributes on the field', () => {
    bar()
    expect(screen.getByTestId('find-input')).toHaveAttribute('data-file-search-input', 'true')
    expect(
      screen.getByTestId('find-input').closest('[data-ignore-file-explorer-keys]')
    ).not.toBeNull()
  })
})
