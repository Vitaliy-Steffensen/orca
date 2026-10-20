import type { editor, Selection } from 'monaco-editor'
import { monaco } from '@/lib/monaco-setup'
import { getContextualCopyLineRange } from './selection-copy'

/**
 * Where the floating toolbar sits for the current selection: above it when there is room,
 * below it when there is not. Null while Monaco has not laid the selection out.
 */
export function computeSelectionToolbarPosition({
  editorInstance,
  model,
  selection,
  toolbarHeight
}: {
  editorInstance: editor.ICodeEditor
  model: editor.ITextModel
  selection: Selection
  toolbarHeight: number
}): editor.IContentWidgetPosition | null {
  const { startLine, endLine } = getContextualCopyLineRange(selection)
  const startVisiblePosition = editorInstance.getScrolledVisiblePosition(
    selection.getStartPosition()
  )
  const endColumn =
    selection.endLineNumber === endLine ? selection.endColumn : model.getLineMaxColumn(endLine)
  const endVisiblePosition = editorInstance.getScrolledVisiblePosition({
    lineNumber: endLine,
    column: endColumn
  })

  if (!startVisiblePosition || !endVisiblePosition) {
    return null
  }

  const verticalGap = 8
  const viewportHeight = editorInstance.getLayoutInfo().height
  const selectionBottom = endVisiblePosition.top + endVisiblePosition.height
  const spaceAbove = startVisiblePosition.top
  const spaceBelow = viewportHeight - selectionBottom
  const placeAbove = spaceAbove >= toolbarHeight + verticalGap || spaceAbove >= spaceBelow
  const anchorLineNumber = placeAbove ? startLine : endLine
  const anchorColumn = placeAbove
    ? model.getLineMaxColumn(startLine)
    : selection.endLineNumber !== endLine
      ? model.getLineMaxColumn(endLine)
      : selection.endColumn

  return {
    position: { lineNumber: anchorLineNumber, column: anchorColumn },
    secondaryPosition: {
      lineNumber: anchorLineNumber,
      column: Math.max(1, anchorColumn - 1)
    },
    preference: [
      placeAbove
        ? monaco.editor.ContentWidgetPositionPreference.ABOVE
        : monaco.editor.ContentWidgetPositionPreference.BELOW
    ]
  }
}
