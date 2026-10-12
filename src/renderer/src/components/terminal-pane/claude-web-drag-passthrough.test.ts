// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { acquireWebviewsDragPassthrough } from '@/components/browser-pane/host-guest/webview-drag-passthrough'
import { enrolClaudeWebviewInDragPassthrough } from './claude-web-drag-passthrough'

describe('enrolClaudeWebviewInDragPassthrough', () => {
  it('lets a tab drag pass over the Claude page instead of the page taking the pointer', () => {
    const webview = document.createElement('div')
    const unenrol = enrolClaudeWebviewInDragPassthrough(webview)
    const release = acquireWebviewsDragPassthrough()
    expect(webview.style.pointerEvents).toBe('none')
    release()
    expect(webview.style.pointerEvents).toBe('')
    unenrol()
  })

  it('is click-through at once when it appears during a drag, and stops following drags once gone', () => {
    const release = acquireWebviewsDragPassthrough()
    const webview = document.createElement('div')
    const unenrol = enrolClaudeWebviewInDragPassthrough(webview)
    expect(webview.style.pointerEvents).toBe('none')
    unenrol()
    release()
    expect(webview.style.pointerEvents).toBe('none')
  })
})
