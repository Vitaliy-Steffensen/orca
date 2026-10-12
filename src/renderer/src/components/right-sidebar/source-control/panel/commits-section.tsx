import { GitHistoryPanel } from '../sync/git-history-panel'
import { HideSectionContextMenu } from '../listing/section-chrome'
import { toggleSourceControlSectionHidden } from '../../../../../../shared/source-control-sections'
import type { SourceControlPanelReadyProps } from './panel-props'

// Fork: Commits closes the stacked sections, scrolling with them rather than docked at the bottom.
export function SourceControlCommitsSection({
  model
}: Pick<SourceControlPanelReadyProps, 'model'>): React.JSX.Element | null {
  const {
    settings,
    updateSettings,
    collapsedSections,
    toggleSection,
    gitHistoryState,
    isGitHistoryVisible,
    refreshGitHistory,
    openHistoryCommitDiff,
    loadCommitFiles,
    openCommitFile,
    handleCommitAction
  } = model
  const sectionLayout = settings?.sourceControlSectionLayout
  const hiddenSections = sectionLayout?.hidden ?? []
  if (!isGitHistoryVisible || hiddenSections.includes('commits')) {
    return null
  }
  const hideCommits = (): void => {
    void updateSettings({
      sourceControlSectionLayout: {
        ...sectionLayout,
        hidden: toggleSourceControlSectionHidden(hiddenSections, 'commits')
      }
    })
  }
  return (
    <HideSectionContextMenu onHide={hideCommits}>
      <div className="border-t border-border">
        <GitHistoryPanel
          state={gitHistoryState}
          collapsed={collapsedSections.has('history')}
          onToggle={() => toggleSection('history')}
          onRefresh={() => void refreshGitHistory()}
          onOpenCommit={(item) => void openHistoryCommitDiff(item)}
          onLoadCommitFiles={loadCommitFiles}
          onOpenCommitFile={openCommitFile}
          onCommitAction={handleCommitAction}
        />
      </div>
    </HideSectionContextMenu>
  )
}
