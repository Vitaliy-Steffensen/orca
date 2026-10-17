import type { RightSidebarExplorerView } from '../../../../../shared/ui-chrome-types'

/** What the find bar's query is matched against. */
export type FileFindMode = 'names' | 'contents'

/**
 * The Explorer persists its mode as route state whose values predate the find bar, and a legacy
 * `search` tab already migrates into them. Map at the boundary instead of renaming them.
 */
export function explorerViewToFindMode(view: RightSidebarExplorerView): FileFindMode {
  return view === 'search' ? 'contents' : 'names'
}

export function findModeToExplorerView(mode: FileFindMode): RightSidebarExplorerView {
  return mode === 'contents' ? 'search' : 'files'
}
