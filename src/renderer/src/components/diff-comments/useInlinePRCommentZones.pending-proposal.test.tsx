// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { editor as MonacoEditor } from 'monaco-editor'
import type { PendingReviewComment } from '../../../../shared/github/pending-review-comment'
import type { PendingReviewQueue } from '@/components/pending-review/use-pending-review-queue'

vi.mock('monaco-editor', () => import('monaco-editor/esm/vs/editor/editor.api.js'))

const storeFixture = vi.hoisted(() => ({ openDiffAtLocation: vi.fn() }))

vi.mock('@/store', () => ({
  useAppStore: (selector: (state: typeof storeFixture) => unknown) => selector(storeFixture)
}))
vi.mock('@/store/selectors', () => ({ useActiveWorktree: () => null }))

import { useInlinePRCommentZones } from './useInlinePRCommentZones'

afterEach(() => {
  document.body.replaceChildren()
  vi.clearAllMocks()
})

const proposal: PendingReviewComment = {
  id: 'p1',
  path: 'apps/frontend/a.ts',
  line: 16,
  startLine: 15,
  body: 'Two list requests can return the same product',
  createdAt: 0,
  agentAuthor: { kind: 'agent', name: 'Claude Code (review-fe)' },
  status: 'proposed'
}

function makeQueue(): PendingReviewQueue {
  return {
    comments: [proposal],
    add: vi.fn(),
    updateBody: vi.fn(),
    remove: vi.fn(),
    accept: vi.fn(),
    acceptAll: vi.fn(),
    discardProposals: vi.fn(),
    keepProposals: vi.fn(),
    clear: vi.fn()
  }
}

describe('a proposal staged on a diff line', () => {
  it('renders inside its view zone, tooltips and all', async () => {
    const zones: MonacoEditor.IViewZone[] = []
    const accessor: MonacoEditor.IViewZoneChangeAccessor = {
      addZone: (zone) => {
        zones.push(zone)
        return `zone-${zones.length}`
      },
      removeZone: () => undefined,
      layoutZone: () => undefined
    }
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: a partial stand-in for Monaco's ICodeEditor; the hook calls only the members defined here, and a real editor needs a laid-out DOM this suite does not build.
    const editor = {
      getModel: () => ({ getLineCount: () => 40 }),
      getLayoutInfo: () => ({ contentWidth: 800 }),
      getScrollLeft: () => 0,
      onDidScrollChange: () => ({ dispose: () => {} }),
      onDidLayoutChange: () => ({ dispose: () => {} }),
      changeViewZones: (callback: (a: MonacoEditor.IViewZoneChangeAccessor) => void) =>
        callback(accessor)
    } as unknown as MonacoEditor.ICodeEditor

    await act(async () => {
      renderHook(() =>
        useInlinePRCommentZones({
          editor,
          modelKey: 'modified-v1',
          groups: [],
          relativePath: 'apps/frontend/a.ts',
          worktreeId: 'worktree-1',
          pendingReview: makeQueue(),
          handlers: {
            onResolve: vi.fn(),
            onReply: vi.fn(),
            onEditComment: vi.fn(),
            onDeleteComment: vi.fn(),
            onSetReaction: vi.fn()
          }
        })
      )
    })

    expect(zones).toHaveLength(1)
    const text = zones[0]?.domNode.textContent ?? ''
    expect(text).toContain('Two list requests can return the same product')
    expect(text).toContain('Accept')
  })
})
