// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getSourceControlReviewOrder } from '@/lib/source-control-review-order'
import type { ReviewPlan } from '../../../../../shared/review-plan'

const planState = vi.hoisted<{ current: { status: string; plan?: ReviewPlan } }>(() => ({
  current: { status: 'loading' }
}))
const storeState = vi.hoisted(() => ({ head: 'head-sha' }))

vi.mock('./use-review-plan', () => ({ useReviewPlan: () => planState.current }))
vi.mock('@/components/diff-comments/file-comment-counts', () => ({
  useWorkspaceFileCommentCounts: () => new Map()
}))
vi.mock('../workspace-actions/launch-workspace-action', () => ({
  launchWorkspaceAction: () => Promise.resolve()
}))
vi.mock('@/store', () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      activeWorktreeId: 'wt-1',
      getKnownWorktreeById: () => ({ path: '/tmp/repo' }),
      gitStatusHeadByWorktree: { 'wt-1': storeState.head },
      gitBranchChangesByWorktree: { 'wt-1': [{ path: 'src/a.ts' }, { path: 'src/untouched.ts' }] },
      gitStatusByWorktree: {},
      openFile: () => {},
      setEditorViewMode: () => {}
    })
}))

const { ReviewPlanTree } = await import('./ReviewPlanTree')

const PLAN: ReviewPlan = {
  schema: 1,
  commit: 'plan-sha',
  groups: [
    { n: 1, title: 'Worker injects clients', files: ['src/a.ts'] },
    { n: 2, title: 'Low-value moves', files: ['src/b.ts'] }
  ],
  ratings: {
    'src/a.ts': { score: 0.9, reason: 'control flow' },
    'src/b.ts': { score: 0.2, reason: 'rename' },
    'src/untouched.ts': { score: 0.7, reason: 'not grouped' }
  }
}

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  planState.current = { status: 'ready', plan: PLAN }
  storeState.head = 'head-sha'
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function render(props: { publishOrder?: boolean } = {}): void {
  act(() => {
    root.render(<ReviewPlanTree {...props} />)
  })
}

describe('review plan tree', () => {
  it('warns that the grouping is for another commit, and clears when it matches head', () => {
    render()
    expect(host.textContent).toContain('Grouped for plan-sh')

    storeState.head = 'plan-sha'
    render()

    expect(host.textContent).not.toContain('Grouped for')
  })

  it('shows every group, and the files the plan never grouped in their own bucket', () => {
    render()

    expect(host.textContent).toContain('1. Worker injects clients')
    expect(host.textContent).toContain('2. Low-value moves')
    expect(host.textContent).toContain('Not in the review plan')
  })

  // Why one writer: the step registry holds a single order per workspace, and the Source Control
  // panel writes it too. A second mounted copy of this tree must not race the tab for that slot.
  it('publishes the visible order only when it is asked to', () => {
    render({ publishOrder: false })
    expect(getSourceControlReviewOrder('wt-1')).toBeNull()

    render({ publishOrder: true })
    expect(getSourceControlReviewOrder('wt-1')).toEqual([
      'src/a.ts',
      'src/b.ts',
      'src/untouched.ts'
    ])
  })

  it('points at the header Review action when there is no plan yet, without a button of its own', () => {
    planState.current = { status: 'missing' }

    render()

    expect(host.textContent).toContain('No review plan yet')
    expect(host.querySelector('button')).toBeNull()
  })
})
