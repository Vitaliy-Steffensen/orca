import type { SourceControlPanelModel } from './use-panel-model'

export type SourceControlPanelMode = 'local' | 'pull-request'

/** The panel once its repo/worktree guards have narrowed — every rendered piece takes this shape. */
export type SourceControlPanelReadyProps = {
  mode: SourceControlPanelMode
  activeRepo: NonNullable<SourceControlPanelModel['activeRepo']>
  activeWorktree: NonNullable<SourceControlPanelModel['activeWorktree']>
  currentWorktreeId: string
  model: SourceControlPanelModel
  worktreePath: string
}
