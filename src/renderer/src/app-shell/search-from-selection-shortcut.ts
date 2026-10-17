import { getSelectedTextForFileSearch } from '../lib/file-search-selection'
import {
  folderRelativePathToIncludeGlob,
  selectedExplorerFolderRelativePath
} from '../components/right-sidebar/file-search-include-pattern'
import type { AppShortcutActions } from './app-command-handlers'

/**
 * `sidebar.search.toggle` seeded from what is selected: a folder in the explorer means "Find in
 * Folder", selected text means search for it. Returns false to let the plain toggle run.
 */
export function takeSearchFromSelectionShortcut({
  activeWorktreeId,
  actions
}: {
  activeWorktreeId: string | null
  actions: AppShortcutActions
}): boolean {
  const selectedFolderRelativePath =
    document.activeElement instanceof Element
      ? selectedExplorerFolderRelativePath(document.activeElement)
      : null
  if (selectedFolderRelativePath !== null && activeWorktreeId) {
    actions.showRightSidebarSearch({
      includePattern: folderRelativePathToIncludeGlob(selectedFolderRelativePath)
    })
    return true
  }

  const selectedText = getSelectedTextForFileSearch()
  if (!selectedText) {
    return false
  }
  actions.showRightSidebarSearch({ query: selectedText })
  return true
}
