// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChangedFilesFindBar } from './ChangedFilesFindBar'
import type { FileFindMode } from './file-find-mode'

vi.mock('@/i18n/i18n', () => ({
  translate: (_key: string, fallback: string) => fallback
}))

const store = { rightSidebarFindExpanded: true, rightSidebarFindFocusRequestId: 0 }
vi.mock('@/store', () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ ...store, setRightSidebarFindExpanded: () => undefined })
}))

afterEach(cleanup)

function contentSearchProps(query: string, onQueryChange: (value: string) => void) {
  return {
    inputRef: React.createRef<HTMLInputElement>(),
    query,
    loading: false,
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
    onQueryChange,
    onKeyDown: () => undefined,
    onClearSearch: () => undefined,
    onToggleCaseSensitive: () => undefined,
    onToggleWholeWord: () => undefined,
    onToggleRegex: () => undefined
  }
}

function renderBar(mode: FileFindMode, handlers: Record<string, (value: string) => void> = {}) {
  return render(
    <ChangedFilesFindBar
      mode={mode}
      onModeChange={vi.fn()}
      nameFilterQuery="name-query"
      onNameFilterChange={handlers.onNameFilterChange ?? vi.fn()}
      contentSearch={contentSearchProps('content-query', handlers.onQueryChange ?? vi.fn())}
      testId="changed-files-find-input"
    />
  )
}

describe('ChangedFilesFindBar', () => {
  it('offers the Contents mode these panels now support', () => {
    renderBar('names')
    expect(screen.getByLabelText('Search file contents')).toBeInTheDocument()
  })

  it('keeps the name filter and content query independent', () => {
    const onNameFilterChange = vi.fn()
    const onQueryChange = vi.fn()

    const names = renderBar('names', { onNameFilterChange, onQueryChange })
    expect(screen.getByTestId('changed-files-find-input')).toHaveValue('name-query')
    fireEvent.change(screen.getByTestId('changed-files-find-input'), {
      target: { value: 'typed' }
    })
    expect(onNameFilterChange).toHaveBeenCalledWith('typed')
    expect(onQueryChange).not.toHaveBeenCalled()
    names.unmount()

    renderBar('contents', { onNameFilterChange, onQueryChange })
    expect(screen.getByTestId('changed-files-find-input')).toHaveValue('content-query')
    fireEvent.change(screen.getByTestId('changed-files-find-input'), {
      target: { value: 'typed' }
    })
    expect(onQueryChange).toHaveBeenCalledWith('typed')
    expect(onNameFilterChange).toHaveBeenCalledTimes(1)
  })

  it('shows the case/word/regex toggles only in Contents mode', () => {
    const names = renderBar('names')
    expect(screen.queryByTitle('Match Case')).not.toBeInTheDocument()
    names.unmount()
    renderBar('contents')
    expect(screen.getByTitle('Match Case')).toBeInTheDocument()
  })
})
