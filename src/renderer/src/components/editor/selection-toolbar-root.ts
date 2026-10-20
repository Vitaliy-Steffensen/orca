import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { MonacoSelectionToolbar, type MonacoSelectionToolbarProps } from './MonacoSelectionToolbar'

export type SelectionToolbarRoot = {
  render: (props: MonacoSelectionToolbarProps) => void
  dispose: () => void
}

/** Keeps React out of `setup-contextual-copy`, which runs in Monaco's imperative lifecycle. */
export function createSelectionToolbarRoot(node: HTMLElement): SelectionToolbarRoot {
  const root = createRoot(node)
  return {
    render: (props) => root.render(createElement(MonacoSelectionToolbar, props)),
    // Why: Monaco disposes the widget synchronously; React refuses an unmount inside a render.
    dispose: () => queueMicrotask(() => root.unmount())
  }
}
