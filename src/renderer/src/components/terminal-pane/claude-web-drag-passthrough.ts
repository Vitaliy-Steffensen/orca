import {
  isWebviewDragPassthroughActive,
  registerWebviewDragPassthroughSurface
} from '@/components/browser-pane/host-guest/webview-drag-passthrough'

// Fork: the Claude page is a <webview> outside the browser-tab registry, so it enrols itself.
// Without it a tab drag over the page loses the pointer to the guest, and the window blur that
// follows ends the drag with the tab dropped nowhere.
export function enrolClaudeWebviewInDragPassthrough(webview: HTMLElement): () => void {
  const apply = (passthrough: boolean): void => {
    webview.style.pointerEvents = passthrough ? 'none' : ''
  }
  if (isWebviewDragPassthroughActive()) {
    apply(true)
  }
  return registerWebviewDragPassthroughSurface(apply)
}
