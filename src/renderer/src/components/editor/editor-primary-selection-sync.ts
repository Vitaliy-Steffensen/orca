import type { editor } from 'monaco-editor'
import {
  PRIMARY_SELECTION_MAX_LENGTH,
  isPrimarySelectionEnabled,
  setPrimarySelectionText
} from '@/lib/primary-selection'

/** Mirrors the editor's selection into X11's primary-selection buffer, debounced like a drag. */
export function createPrimarySelectionSync(editorInstance: editor.ICodeEditor): {
  schedule: () => void
  cancel: () => void
} {
  let timer: number | null = null

  const update = (): void => {
    const model = editorInstance.getModel()
    const selections = editorInstance.getSelections()
    if (!isPrimarySelectionEnabled() || !model || !selections?.length) {
      return
    }

    const sortedSelections = selections.slice().sort((a, b) => {
      if (a.startLineNumber !== b.startLineNumber) {
        return a.startLineNumber - b.startLineNumber
      }
      return a.startColumn - b.startColumn
    })

    let totalLength = 0
    for (const selection of sortedSelections) {
      if (selection.isEmpty()) {
        return
      }
      totalLength += model.getValueLengthInRange(selection)
      if (totalLength > PRIMARY_SELECTION_MAX_LENGTH) {
        return
      }
    }

    setPrimarySelectionText(
      sortedSelections.map((selection) => model.getValueInRange(selection)).join(model.getEOL())
    )
  }

  return {
    schedule: () => {
      if (timer !== null) {
        window.clearTimeout(timer)
      }
      // Why: Monaco emits intermediate selection changes during drag; match the
      // editor selection clipboard debounce so we don't churn the clipboard.
      timer = window.setTimeout(() => {
        timer = null
        update()
      }, 100)
    },
    cancel: () => {
      if (timer !== null) {
        window.clearTimeout(timer)
        timer = null
      }
    }
  }
}
