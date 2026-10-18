import type {
  TerminalLayoutSnapshot,
  TerminalPaneLayoutNode,
  TerminalPaneSplitDirection
} from '../../../shared/terminal-tab-types'

export const WORKSPACE_RUN_SPLIT_DIRECTION: TerminalPaneSplitDirection = 'vertical'

export type WorkspaceRunPane = {
  leafId: string
  ptyId: string
  label: string
}

/** Right-nested, so each service splits the pane before it — the shape the split placement describes. */
export function workspaceRunSplitRoot(leafIds: readonly string[]): TerminalPaneLayoutNode {
  const [first, ...rest] = leafIds
  if (rest.length === 0) {
    return { type: 'leaf', leafId: first }
  }
  return {
    type: 'split',
    direction: WORKSPACE_RUN_SPLIT_DIRECTION,
    first: { type: 'leaf', leafId: first },
    second: workspaceRunSplitRoot(rest)
  }
}

export function workspaceRunSplitLayout(
  panes: readonly WorkspaceRunPane[]
): TerminalLayoutSnapshot {
  return {
    root: workspaceRunSplitRoot(panes.map((pane) => pane.leafId)),
    activeLeafId: panes[0].leafId,
    expandedLeafId: null,
    ptyIdsByLeafId: Object.fromEntries(panes.map((pane) => [pane.leafId, pane.ptyId])),
    titlesByLeafId: Object.fromEntries(panes.map((pane) => [pane.leafId, pane.label]))
  }
}
