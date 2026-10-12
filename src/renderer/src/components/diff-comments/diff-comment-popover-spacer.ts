import { useEffect, useRef } from 'react'
import type { editor as monacoEditor } from 'monaco-editor'

const SPACER_GAP_PX = 8

type Spacer = { zoneId: string; zone: monacoEditor.IViewZone }

// Fork: an empty view zone under the comment box's line, as tall as the box, so the box pushes
// the code and saved comments below it down instead of covering them.
export function useDiffCommentPopoverSpacer({
  editor,
  lineNumber,
  height
}: {
  editor: monacoEditor.ICodeEditor | null
  lineNumber: number | null
  height: number
}): void {
  const spacerRef = useRef<Spacer | null>(null)
  const heightRef = useRef(height)
  heightRef.current = height

  useEffect(() => {
    if (!editor || lineNumber === null || !editor.getModel()) {
      return
    }
    editor.changeViewZones((accessor) => {
      const zone: monacoEditor.IViewZone = {
        afterLineNumber: lineNumber,
        // Why 0: saved comment zones sort after it, so the gap sits right under the line.
        ordinal: 0,
        heightInPx: heightRef.current > 0 ? heightRef.current + SPACER_GAP_PX : 0,
        domNode: document.createElement('div'),
        suppressMouseDown: true
      }
      spacerRef.current = { zoneId: accessor.addZone(zone), zone }
    })
    return () => {
      const spacer = spacerRef.current
      spacerRef.current = null
      if (spacer && editor.getModel()) {
        editor.changeViewZones((accessor) => accessor.removeZone(spacer.zoneId))
      }
    }
  }, [editor, lineNumber])

  useEffect(() => {
    const spacer = spacerRef.current
    const next = height > 0 ? height + SPACER_GAP_PX : 0
    if (!editor || !spacer || spacer.zone.heightInPx === next) {
      return
    }
    spacer.zone.heightInPx = next
    editor.changeViewZones((accessor) => accessor.layoutZone(spacer.zoneId))
  }, [editor, height])
}
