import React from 'react'
import { List, ListTree } from 'lucide-react'
import type { SourceControlViewMode } from '../../../../../shared/ui-chrome-types'
import { translate } from '@/i18n/i18n'
import { FileFindToggle } from '../file-find/FileFindToggle'
import { formatSourceControlRefLabel } from '../source-control/panel/branch-context-stats'

type PrDiffHeaderToolbarProps = {
  compareBaseRef: string | null
  findExpanded: boolean
  onToggleFind: () => void
  hasQuery: boolean
  viewMode: SourceControlViewMode
  viewModeToggleDisabled: boolean
  onToggleViewMode: () => void
}

/** Names what the list is comparing against, and hosts the view-mode switch and find magnifier. */
export function PrDiffHeaderToolbar({
  compareBaseRef,
  findExpanded,
  onToggleFind,
  hasQuery,
  viewMode,
  viewModeToggleDisabled,
  onToggleViewMode
}: PrDiffHeaderToolbarProps): React.JSX.Element {
  const ref = compareBaseRef?.trim()
  const viewModeLabel =
    viewMode === 'tree'
      ? translate('auto.components.right.sidebar.SourceControl.a91f8e2b01', 'View as list')
      : translate('auto.components.right.sidebar.SourceControl.b82e9f3c12', 'View as tree')
  return (
    <div className="flex h-8 min-h-8 items-center gap-2 border-b border-border px-2">
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
        {ref
          ? translate('prDiff.comparedAgainst', 'vs {{ref}}', {
              ref: formatSourceControlRefLabel(ref)
            })
          : translate('prDiff.title', 'Changed files')}
      </span>
      <FileFindToggle
        expanded={findExpanded}
        onToggle={onToggleFind}
        hasQuery={hasQuery}
        label={translate(
          'auto.components.right.sidebar.SourceControl.b3c8f1a902',
          'Filter files by name'
        )}
        testId="pr-diff-filter-toggle"
      />
      <button
        type="button"
        data-testid="pr-diff-view-mode-toggle"
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        disabled={viewModeToggleDisabled}
        onClick={onToggleViewMode}
        aria-label={viewModeLabel}
        title={viewModeLabel}
      >
        {viewMode === 'tree' ? <List className="size-3.5" /> : <ListTree className="size-3.5" />}
      </button>
    </div>
  )
}
