import type { editor } from 'monaco-editor'
import { formatShortcutLabel } from '@/hooks/useShortcutLabel'
import { useAppStore } from '@/store'
import { editorShortcutMatches } from './editor-shortcuts'
import {
  canCopySelectionWithContext,
  formatCopiedSelectionWithContext,
  getContextualCopyLineRange
} from './selection-copy'
import type { SelectionAskRequest } from './selection-ask-request'
import { createSelectionToolbarRoot, type SelectionToolbarRoot } from './selection-toolbar-root'
import { computeSelectionToolbarPosition } from './selection-toolbar-widget-position'
import { createPrimarySelectionSync } from './editor-primary-selection-sync'

export function setupContextualCopy({
  editorInstance,
  filePath,
  setCopyToast,
  propsRef,
  copyToastTimeoutRef,
  askTarget,
  onAsk
}: {
  editorInstance: editor.IStandaloneCodeEditor
  filePath: string
  setCopyToast: (toast: { left: number; top: number } | null) => void
  propsRef: React.MutableRefObject<{
    relativePath: string
    language: string
    onSave?: (content: string) => void
  }>
  copyToastTimeoutRef: React.MutableRefObject<number | null>
  /** Null on surfaces with no workspace to launch a chat in, such as a PR's diff. */
  askTarget?: { worktreeId: string } | null
  onAsk?: (request: SelectionAskRequest) => void
}): void {
  let toolbarInterval: number | null = null
  const primarySelection = createPrimarySelectionSync(editorInstance)
  let toolbarWidgetPosition: editor.IContentWidgetPosition | null = null
  let lastCopiedSelectionKey: string | null = null
  let toolbarRoot: SelectionToolbarRoot | null = null
  let renderedToolbarKey: string | null = null
  const toolbarNode = document.createElement('div')
  toolbarNode.className =
    'rounded-md border border-border/90 bg-background p-0.5 shadow-[0_6px_18px_rgba(15,23,42,0.18)] backdrop-blur whitespace-nowrap'
  toolbarNode.style.display = 'none'
  const toolbarWidget: editor.IContentWidget = {
    allowEditorOverflow: true,
    suppressMouseDown: true,
    getId: () => `orca.selection-toolbar.${filePath}`,
    getDomNode: () => toolbarNode,
    getPosition: () => toolbarWidgetPosition
  }
  editorInstance.addContentWidget(toolbarWidget)

  const showCopyToast = (): void => {
    const selection = editorInstance.getSelection()
    if (!selection) {
      return
    }
    const visiblePosition = editorInstance.getScrolledVisiblePosition(selection.getEndPosition())
    const bounds = editorInstance.getContainerDomNode().getBoundingClientRect()
    setCopyToast({
      left: bounds.left + (visiblePosition?.left ?? bounds.width - 120),
      top: bounds.top + (visiblePosition?.top ?? 16) + (visiblePosition?.height ?? 20) + 8
    })
    if (copyToastTimeoutRef.current !== null) {
      window.clearTimeout(copyToastTimeoutRef.current)
    }
    copyToastTimeoutRef.current = window.setTimeout(() => {
      setCopyToast(null)
      copyToastTimeoutRef.current = null
    }, 1200)
  }

  const getSelectionKey = (): string | null => {
    const selection = editorInstance.getSelection()
    if (!selection) {
      return null
    }

    return [
      selection.startLineNumber,
      selection.startColumn,
      selection.endLineNumber,
      selection.endColumn
    ].join(':')
  }

  const hideToolbar = (): void => {
    toolbarNode.style.display = 'none'
    toolbarWidgetPosition = null
    editorInstance.layoutContentWidget(toolbarWidget)
  }

  const askAboutSelection = (): void => {
    const model = editorInstance.getModel()
    const selection = editorInstance.getSelection()
    if (!model || !selection || selection.isEmpty() || !askTarget || !onAsk) {
      return
    }
    const { startLine, endLine } = getContextualCopyLineRange(selection)
    const rect = toolbarNode.getBoundingClientRect()
    onAsk({
      worktreeId: askTarget.worktreeId,
      relativePath: propsRef.current.relativePath,
      language: propsRef.current.language,
      startLine,
      endLine,
      selectedText: model.getValueInRange(selection),
      anchorRect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
    })
  }

  const renderToolbar = (canCopy: boolean, copied: boolean): void => {
    const copyShortcutLabel = formatShortcutLabel(
      'editor.copyContext',
      useAppStore.getState().keybindings
    )
    const key = [Boolean(askTarget && onAsk), canCopy, copied, copyShortcutLabel].join('|')
    if (key === renderedToolbarKey) {
      return
    }
    renderedToolbarKey = key
    toolbarRoot ??= createSelectionToolbarRoot(toolbarNode)
    toolbarRoot.render({
      onAsk: askTarget && onAsk ? askAboutSelection : null,
      onCopy: canCopy ? () => void copySelectionWithContext() : null,
      copyShortcutLabel,
      copied
    })
  }

  const updateToolbar = (): void => {
    const model = editorInstance.getModel()
    const selection = editorInstance.getSelection()
    // Why: toolbar ticks need selection bounds; extracting the selected text scales with file size.
    if (!model || !selection || selection.isEmpty()) {
      hideToolbar()
      return
    }

    renderToolbar(
      canCopySelectionWithContext(selection),
      lastCopiedSelectionKey !== null && lastCopiedSelectionKey === getSelectionKey()
    )
    const position = computeSelectionToolbarPosition({
      editorInstance,
      model,
      selection,
      toolbarHeight: toolbarNode.offsetHeight || 28
    })
    if (!position) {
      hideToolbar()
      return
    }
    toolbarWidgetPosition = position
    toolbarNode.style.display = 'block'
    editorInstance.layoutContentWidget(toolbarWidget)
  }

  const isToolbarVisible = (): boolean => toolbarNode.style.display === 'block'

  const startToolbarPolling = (): void => {
    if (toolbarInterval !== null) {
      return
    }
    toolbarInterval = window.setInterval(() => {
      updateToolbar()
      if (!isToolbarVisible()) {
        stopToolbarPolling()
      }
    }, 150)
  }

  const stopToolbarPolling = (): void => {
    if (toolbarInterval !== null) {
      window.clearInterval(toolbarInterval)
      toolbarInterval = null
    }
  }

  const refreshToolbarAndPolling = (): void => {
    updateToolbar()
    if (editorInstance.hasTextFocus() && isToolbarVisible()) {
      // Why: the interval only tracks a visible content widget. Keeping it
      // alive while the focused editor has no selection burns idle CPU.
      startToolbarPolling()
    } else {
      stopToolbarPolling()
    }
  }

  const getContextualCopyText = (): string | null => {
    const model = editorInstance.getModel()
    const selection = editorInstance.getSelection()
    if (!model || !selection || selection.isEmpty()) {
      return null
    }

    return formatCopiedSelectionWithContext({
      relativePath: propsRef.current.relativePath,
      language: propsRef.current.language,
      selection,
      selectedText: model.getValueInRange(selection)
    })
  }

  const copySelectionWithContext = async (): Promise<boolean> => {
    const copiedText = getContextualCopyText()
    if (!copiedText) {
      return false
    }

    // Why: terminal agents only receive pasted plain text. We write the
    // contextual payload at copy time so file and line metadata survives
    // once the snippet leaves Orca and is pasted into a terminal.
    await window.api.ui.writeClipboardText(copiedText)
    // Why: the toolbar stays up — Ask is wanted most right after a copy — but the
    // Copy button reads as spent until the selection actually changes.
    lastCopiedSelectionKey = getSelectionKey()
    updateToolbar()
    showCopyToast()
    return true
  }

  const selectionListener = editorInstance.onDidChangeCursorSelection((event) => {
    if (event.source !== 'restoreState') {
      primarySelection.schedule()
    }
    if (getSelectionKey() !== lastCopiedSelectionKey) {
      lastCopiedSelectionKey = null
    }
    refreshToolbarAndPolling()
  })
  const scrollListener = editorInstance.onDidScrollChange(() => {
    refreshToolbarAndPolling()
  })
  const focusListener = editorInstance.onDidFocusEditorText(() => {
    refreshToolbarAndPolling()
  })
  const blurListener = editorInstance.onDidBlurEditorText(() => {
    stopToolbarPolling()
    hideToolbar()
  })

  const editorDomNode = editorInstance.getContainerDomNode()
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (!editorShortcutMatches('editor.copyContext', event)) {
      return
    }

    // Why: Monaco and Chromium can claim some Cmd/Ctrl+Shift shortcuts before the Monaco
    // command callback runs. Capturing the shortcut on the editor DOM keeps the
    // contextual-copy action reliable without changing native Cmd/Ctrl+C.
    event.preventDefault()
    event.stopPropagation()
    void copySelectionWithContext()
  }
  editorDomNode.addEventListener('keydown', handleKeyDown, true)
  editorDomNode.addEventListener('mouseup', refreshToolbarAndPolling, true)
  editorDomNode.addEventListener('keyup', refreshToolbarAndPolling, true)
  editorInstance.onDidDispose(() => {
    // Why: Monaco owns these emitters, but disposing explicitly keeps this
    // feature's lifecycle symmetrical with the DOM listener cleanup below.
    selectionListener.dispose()
    scrollListener.dispose()
    focusListener.dispose()
    blurListener.dispose()
    // Why: the confirmation toast timeout belongs to the Monaco editor that
    // scheduled it, so editor disposal is the earliest reliable cleanup point.
    if (copyToastTimeoutRef.current !== null) {
      window.clearTimeout(copyToastTimeoutRef.current)
      copyToastTimeoutRef.current = null
      setCopyToast(null)
    }
    primarySelection.cancel()
    editorDomNode.removeEventListener('keydown', handleKeyDown, true)
    editorDomNode.removeEventListener('mouseup', refreshToolbarAndPolling, true)
    editorDomNode.removeEventListener('keyup', refreshToolbarAndPolling, true)
    stopToolbarPolling()
    editorInstance.removeContentWidget(toolbarWidget)
    toolbarRoot?.dispose()
    toolbarRoot = null
  })
  if (editorInstance.hasTextFocus()) {
    refreshToolbarAndPolling()
  } else {
    updateToolbar()
  }
}
