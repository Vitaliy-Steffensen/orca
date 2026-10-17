import React from 'react'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { FileFindBar } from './FileFindBar'
import { ContentSearchToggles, type ContentSearchFieldProps } from './ContentSearchToggles'
import type { FileFindMode } from './file-find-mode'

type ChangedFilesFindBarProps = {
  mode: FileFindMode
  onModeChange: (mode: FileFindMode) => void
  nameFilterQuery: string
  onNameFilterChange: (value: string) => void
  contentSearch: ContentSearchFieldProps
  testId: string
}

/**
 * The shared find bar for the two changed-file panels. Their Contents mode searches
 * working-tree text confined to the files they list, so it binds the same two
 * independent query controllers the Explorer does.
 */
export function ChangedFilesFindBar({
  mode,
  onModeChange,
  nameFilterQuery,
  onNameFilterChange,
  contentSearch,
  testId
}: ChangedFilesFindBarProps): React.JSX.Element {
  const expanded = useAppStore((s) => s.rightSidebarFindExpanded)
  const focusRequestId = useAppStore((s) => s.rightSidebarFindFocusRequestId)
  const setExpanded = useAppStore((s) => s.setRightSidebarFindExpanded)
  const isContents = mode === 'contents'

  const nameFilterLabel = translate(
    'auto.components.right.sidebar.SourceControl.c35baf2f1e',
    'Filter files...'
  )

  return (
    <FileFindBar
      expanded={expanded}
      onExpandedChange={setExpanded}
      mode={mode}
      onModeChange={onModeChange}
      supportsContents
      query={isContents ? contentSearch.query : nameFilterQuery}
      onQueryChange={isContents ? contentSearch.onQueryChange : onNameFilterChange}
      onClear={isContents ? contentSearch.onClearSearch : () => onNameFilterChange('')}
      inputRef={isContents ? contentSearch.inputRef : undefined}
      focusRequestId={focusRequestId}
      loading={isContents ? contentSearch.loading : false}
      ariaLabel={
        isContents
          ? translate('auto.components.right.sidebar.SearchQueryRow.queryLabel', 'Search files')
          : nameFilterLabel
      }
      placeholder={
        isContents
          ? translate('auto.components.right.sidebar.SearchHeader.693cbeadd0', 'Search')
          : nameFilterLabel
      }
      onKeyDown={isContents ? contentSearch.onKeyDown : undefined}
      trailing={isContents ? <ContentSearchToggles {...contentSearch} /> : null}
      testId={testId}
    />
  )
}
