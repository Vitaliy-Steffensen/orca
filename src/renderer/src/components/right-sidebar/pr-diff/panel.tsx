import React from 'react'
import { translate } from '@/i18n/i18n'
import { usePrDiffModel } from './use-pr-diff-model'
import { PrDiffChangedFilesList } from './changed-files-list'

function PrDiffNotice({ message }: { message: string }): React.JSX.Element {
  return <p className="px-3 py-4 text-xs text-muted-foreground">{message}</p>
}

export function PrDiffViewerPanel(): React.JSX.Element {
  const model = usePrDiffModel()
  if (!model.activeWorktreeId || !model.worktreePath) {
    return (
      <PrDiffNotice
        message={translate('prDiff.noWorkspace', 'Select a workspace to see its changed files.')}
      />
    )
  }
  // Why: the activity item is already gitOnly, but a persisted route can still land here.
  if (model.isFolder) {
    return (
      <PrDiffNotice
        message={translate(
          'prDiff.folderWorkspace',
          'Changed files are only available for Git repositories.'
        )}
      />
    )
  }
  return <PrDiffChangedFilesList model={model} />
}
