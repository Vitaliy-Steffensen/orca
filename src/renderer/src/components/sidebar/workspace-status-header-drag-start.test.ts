// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'

import { createWorkspaceStatusHeaderDragSession } from './workspace-status-header-drag-start'

const BUCKETS = new Map([['workspace-status-sections', ['band:a', 'band:b']]])

function armDrag(args: {
  target: Element
  header: HTMLElement
  headerKey?: string
  button?: number
  buckets?: ReadonlyMap<string, readonly string[]>
}) {
  const scrollContainer = document.createElement('div')
  document.body.append(scrollContainer, args.header)
  return createWorkspaceStatusHeaderDragSession({
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the session reads only these pointer-event fields.
    event: {
      button: args.button ?? 0,
      pointerId: 1,
      clientX: 10,
      clientY: 20,
      target: args.target,
      currentTarget: args.header
    } as unknown as React.PointerEvent<HTMLElement>,
    headerKey: args.headerKey ?? 'band:a',
    sidebarStatusHeaderKeysByBucket: args.buckets ?? BUCKETS,
    getScrollContainer: () => scrollContainer
  })
}

function dragHandleHeader(): { header: HTMLElement; label: HTMLElement } {
  const header = document.createElement('div')
  header.setAttribute('data-workspace-status-header-drag-handle', '')
  const label = document.createElement('span')
  header.append(label)
  return { header, label }
}

describe('createWorkspaceStatusHeaderDragSession', () => {
  it('arms from the header title and finds the bucket', () => {
    const { header, label } = dragHandleHeader()

    const session = armDrag({ target: label, header })

    expect(session?.headerKey).toBe('band:a')
    expect(session?.bucketKey).toBe('workspace-status-sections')
    expect(session?.promoted).toBe(false)
  })

  it('refuses a press that is not on the drag handle', () => {
    const header = document.createElement('div')
    const label = document.createElement('span')
    header.append(label)

    expect(armDrag({ target: label, header })).toBeNull()
  })

  it('refuses a press on a header action', () => {
    const { header } = dragHandleHeader()
    const action = document.createElement('button')
    action.setAttribute('data-repo-header-actions', '')
    header.append(action)

    expect(armDrag({ target: action, header })).toBeNull()
  })

  it('refuses a lone header and a non-left button', () => {
    const { header, label } = dragHandleHeader()

    expect(
      armDrag({
        target: label,
        header,
        buckets: new Map([['workspace-status-sections', ['band:a']]])
      })
    ).toBeNull()
    expect(armDrag({ target: label, header, button: 2 })).toBeNull()
  })
})
