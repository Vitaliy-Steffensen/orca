import React from 'react'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { FileFindBar } from './FileFindBar'
import { ContentSearchToggles, type ContentSearchFieldProps } from './ContentSearchToggles'
import { explorerViewToFindMode, findModeToExplorerView } from './file-find-mode'
import type { RightSidebarExplorerView } from '../../../../../shared/ui-chrome-types'

type ExplorerFindBarProps = {
  explorerView: RightSidebarExplorerView
  onSelectView: (view: RightSidebarExplorerView) => void
  nameFilterQuery: string
  nameFilterScopeLabel?: string
  nameFilterLoading: boolean
  onNameFilterChange: (value: string) => void
  onClearNameFilter: () => void
  contentSearch: ContentSearchFieldProps
}

/** Binds the shared find bar to the Explorer's two independent query controllers. */
export function ExplorerFindBar({
  explorerView,
  onSelectView,
  nameFilterQuery,
  nameFilterScopeLabel,
  nameFilterLoading,
  onNameFilterChange,
  onClearNameFilter,
  contentSearch
}: ExplorerFindBarProps): React.JSX.Element {
  const expanded = useAppStore((s) => s.rightSidebarFindExpanded)
  const focusRequestId = useAppStore((s) => s.rightSidebarFindFocusRequestId)
  const setExpanded = useAppStore((s) => s.setRightSidebarFindExpanded)
  const mode = explorerViewToFindMode(explorerView)
  const isContents = mode === 'contents'

  const nameFilterLabel = translate(
    'auto.components.right.sidebar.FileExplorerNameFilter.26fb73c6e3',
    'Find files'
  )

  return (
    <FileFindBar
      expanded={expanded}
      onExpandedChange={setExpanded}
      mode={mode}
      onModeChange={(next) => onSelectView(findModeToExplorerView(next))}
      supportsContents
      query={isContents ? contentSearch.query : nameFilterQuery}
      onQueryChange={isContents ? contentSearch.onQueryChange : onNameFilterChange}
      onClear={isContents ? contentSearch.onClearSearch : onClearNameFilter}
      inputRef={isContents ? contentSearch.inputRef : undefined}
      focusRequestId={focusRequestId}
      loading={isContents ? contentSearch.loading : nameFilterLoading}
      ariaLabel={
        isContents
          ? translate('auto.components.right.sidebar.SearchQueryRow.queryLabel', 'Search files')
          : nameFilterLabel
      }
      placeholder={
        isContents
          ? translate('auto.components.right.sidebar.SearchHeader.693cbeadd0', 'Search')
          : nameFilterScopeLabel
            ? translate('fileExplorer.root.findInFolder', 'Find in {{path}}', {
                path: nameFilterScopeLabel
              })
            : nameFilterLabel
      }
      onKeyDown={isContents ? contentSearch.onKeyDown : undefined}
      trailing={isContents ? <ContentSearchToggles {...contentSearch} /> : null}
      testId="file-explorer-find-input"
    />
  )
}
