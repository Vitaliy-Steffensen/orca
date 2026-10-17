// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PrDiffChangedFilesList } from './changed-files-list'
import type { PrDiffModel } from './use-pr-diff-model'
import type { FileFindMode } from '../file-find/file-find-mode'

vi.mock('@/i18n/i18n', () => ({
  translate: (_key: string, fallback: string) => fallback
}))
vi.mock('@/store', () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      rightSidebarFindExpanded: true,
      rightSidebarFindFocusRequestId: 0,
      setRightSidebarFindExpanded: () => undefined,
      revealInExplorer: () => undefined
    })
}))

afterEach(cleanup)

function model(mode: FileFindMode): PrDiffModel {
  const contentSearch = {
    activeWorktreeId: 'wt-1',
    queryRowProps: {
      inputRef: React.createRef<HTMLInputElement>(),
      query: '',
      loading: false,
      caseSensitive: false,
      wholeWord: false,
      useRegex: false,
      onQueryChange: () => undefined,
      onKeyDown: () => undefined,
      onClearSearch: () => undefined,
      onToggleCaseSensitive: () => undefined,
      onToggleWholeWord: () => undefined,
      onToggleRegex: () => undefined
    },
    filtersProps: {
      includePattern: '',
      excludePattern: '',
      onIncludeChange: () => undefined,
      onExcludeChange: () => undefined
    },
    resultsProps: {
      results: null,
      error: null,
      hasCommittedResults: false,
      query: '',
      loading: false,
      rows: [],
      scrollRef: React.createRef<HTMLDivElement>(),
      onToggleCollapsedFile: () => undefined,
      onMatchClick: () => undefined
    },
    focusQueryInput: () => undefined
  }
  const base = {
    activeConnectionId: null,
    activeOpenRowKey: null,
    activeOpenRowKeys: new Set<string>(),
    activeWorktreeId: 'wt-1',
    allChanges: {
      allChangeEntries: [],
      totalAllChangeCount: 0,
      visibleAllChangesTreeRows: [],
      allChangesReviewOrder: [],
      allChangesSelectableEntries: []
    },
    branchSummary: null,
    collapsedTreeDirs: new Set<string>(),
    compareBaseRef: 'refs/remotes/origin/main',
    contentSearch,
    fileListScrollElement: null,
    filter: { normalizedFilter: '', tooLarge: false },
    find: {
      expanded: true,
      setExpanded: () => undefined,
      focusRequestId: 0,
      query: '',
      setQuery: () => undefined,
      mode,
      setMode: () => undefined
    },
    isFolder: false,
    openAllChangesEntry: () => undefined,
    refreshBranchCompare: async () => undefined,
    resolveSplitTargetGroupId: () => null,
    setCollapsedTreeDirs: () => undefined,
    setFileListScrollElement: () => undefined,
    sourceControlViewMode: 'list',
    worktreePath: '/repo'
  }
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the list reads only the fields above; the rest of PrDiffModel feeds hooks this test does not mount.
  return base as unknown as PrDiffModel
}

describe('PR diff viewer contents mode', () => {
  it('lists changed files in Names mode', () => {
    render(<PrDiffChangedFilesList model={model('names')} />)
    expect(screen.getByTestId('pr-diff-file-list')).toBeInTheDocument()
    expect(screen.queryByTestId('pr-diff-content-search-results')).not.toBeInTheDocument()
  })

  it('replaces the list with the search results in Contents mode', () => {
    render(<PrDiffChangedFilesList model={model('contents')} />)
    expect(screen.getByTestId('pr-diff-content-search-results')).toBeInTheDocument()
    expect(screen.queryByTestId('pr-diff-file-list')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('files to include (e.g. *.ts, src/**)')).toBeInTheDocument()
  })
})
