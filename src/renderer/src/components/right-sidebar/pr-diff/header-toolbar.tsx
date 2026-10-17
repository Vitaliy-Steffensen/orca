import React from 'react'
import { translate } from '@/i18n/i18n'
import { FileFindToggle } from '../file-find/FileFindToggle'
import { formatSourceControlRefLabel } from '../source-control/panel/branch-context-stats'

type PrDiffHeaderToolbarProps = {
  compareBaseRef: string | null
  findExpanded: boolean
  onToggleFind: () => void
  hasQuery: boolean
}

/** Names what the list is comparing against, and hosts the find bar's magnifier. */
export function PrDiffHeaderToolbar({
  compareBaseRef,
  findExpanded,
  onToggleFind,
  hasQuery
}: PrDiffHeaderToolbarProps): React.JSX.Element {
  const ref = compareBaseRef?.trim()
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
    </div>
  )
}
