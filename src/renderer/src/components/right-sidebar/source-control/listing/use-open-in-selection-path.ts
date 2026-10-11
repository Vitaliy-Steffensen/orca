import { useEffect, useMemo } from 'react'
import { clearOpenInSelection, setOpenInSelection } from '@/lib/open-in-selection'
import { parseChangedFileRowKey } from '@/store/slices/editor/actions/changed-file-order'
import { joinPath } from '@/lib/path'
import type { FlatEntry } from './use-selection'

// Fork: split out of use-file-listing.ts to keep it under the line limit; upstream's logic unchanged.
export function usePublishedOpenInSelectionPath({
  worktreePath,
  activeOpenRowKey,
  selectedKeys,
  flatEntriesByKey
}: {
  worktreePath: string | null
  activeOpenRowKey: string | null
  selectedKeys: ReadonlySet<string>
  flatEntriesByKey: ReadonlyMap<string, FlatEntry>
}): void {
  // Why the highlighted row rather than the clicked one: stepping with the file-navigation chord
  // moves the highlight without touching the click selection, and the user means whichever row the
  // panel is showing as current -- how they got there is not the point.
  //
  // Why published rather than lifted: the open-in chord reads this once, on a keystroke, and this
  // changes on every step.
  const openInPath = useMemo(() => {
    if (!worktreePath) {
      return null
    }
    const highlighted = activeOpenRowKey
      ? parseChangedFileRowKey(activeOpenRowKey)?.relativePath
      : null
    if (highlighted) {
      return joinPath(worktreePath, highlighted)
    }
    for (const key of selectedKeys) {
      const entry = flatEntriesByKey.get(key)
      if (entry) {
        return joinPath(worktreePath, entry.entry.path)
      }
    }
    return null
  }, [activeOpenRowKey, flatEntriesByKey, selectedKeys, worktreePath])
  useEffect(() => {
    setOpenInSelection('source-control', openInPath)
    return () => clearOpenInSelection('source-control')
  }, [openInPath])
}
