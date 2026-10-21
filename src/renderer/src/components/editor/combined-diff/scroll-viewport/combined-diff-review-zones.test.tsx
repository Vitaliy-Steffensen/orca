// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OpenFile } from '@/store/slices/editor'
import type { Virtualizer } from '@tanstack/react-virtual'
import type { DiffSectionItemProps } from '../../diff-section-item-props'
import type { DiffSection } from '../../diff-section-types'

const captured = vi.hoisted<{ props: DiffSectionItemProps[]; worktreeIds: string[] }>(() => ({
  props: [],
  worktreeIds: []
}))

vi.mock('../../DiffSectionItem', () => ({
  DiffSectionItem: (props: DiffSectionItemProps) => {
    captured.props.push(props)
    return null
  }
}))
vi.mock('../../DiffNotesSendMenu', () => ({ DiffNotesSendMenu: () => null }))
vi.mock('../use-combined-diff-review-zones', () => ({
  useCombinedDiffReviewZones: (worktreeId: string) => {
    captured.worktreeIds.push(worktreeId)
    return ZONES
  }
}))

const { CombinedDiffSectionList } = await import('./combined-diff-section-list')

const SECTION: DiffSection = {
  key: 'branch::src/a.ts',
  path: 'src/a.ts',
  status: 'M',
  originalContent: '',
  modifiedContent: '',
  collapsed: false,
  loading: false,
  dirty: false,
  diffResult: null,
  largeDiffRenderLimit: null
}

// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the list calls only these three virtualizer methods on the one row it renders.
const VIRTUALIZER = {
  getTotalSize: () => 100,
  getVirtualItems: () => [{ key: 'row-0', index: 0, start: 0, size: 100 }],
  measureElement: () => {}
} as unknown as Virtualizer<HTMLDivElement, Element>

// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the list reads only id, filePath and worktreeId off the open file.
const FILE = { id: 'f1', filePath: '/tmp/repo', worktreeId: 'wt-1' } as unknown as OpenFile

const SAVE_REF: DiffSectionItemProps['handleSectionSaveRef'] = {
  current: () => Promise.resolve()
}

const ZONES = {
  groups: [],
  handlers: {
    onResolve: () => false,
    onReply: () => Promise.resolve({ ok: false, error: 'unused' }),
    onEditComment: () => Promise.resolve(false),
    onDeleteComment: () => {},
    onSetReaction: () => Promise.resolve(false)
  }
} satisfies NonNullable<DiffSectionItemProps['reviewZones']>

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  captured.props = []
  captured.worktreeIds = []
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function render(): void {
  act(() => {
    root.render(
      <CombinedDiffSectionList
        activeGroupId={undefined}
        canOpenWorkspaceFileBrowserForPath={() => false}
        diffCommentsForWorktree={[]}
        file={FILE}
        handleSectionSaveRef={SAVE_REF}
        isAllMode
        isBranchMode={false}
        isCommitMode={false}
        isDark={false}
        loadSection={() => {}}
        loadDeferredSection={() => {}}
        markDirectScrollInput={() => {}}
        modifiedEditorsRef={{ current: new Map() }}
        onScrollbarPointerDown={() => {}}
        openSection={() => {}}
        openSectionPreview={() => {}}
        retrySection={() => {}}
        scrollThumb={{ visible: false, top: 0, height: 0 }}
        sectionHeights={{}}
        sections={[SECTION]}
        setScrollContainerRef={() => {}}
        setSectionHeights={() => {}}
        setSections={() => {}}
        settings={null}
        sideBySide={false}
        skippedConflictNotice={null}
        toggleSection={() => {}}
        virtualizer={VIRTUALIZER}
      />
    )
  })
}

describe('combined diff section list', () => {
  // Why this is the whole fix: the stacked all-files view is where a reviewer reads a branch, and
  // its sections never received the staged findings that the file tree's pencil badges count.
  it('hands each section the review zones, so a staged finding paints on its own line', () => {
    render()

    expect(captured.props).toHaveLength(1)
    expect(captured.props[0].reviewZones).toBe(ZONES)
  })

  // Why: the scope and its mutation handlers are far too heavy to rebuild per visible row, and
  // this list is the one component standing between the viewer and the virtualized rows.
  it('resolves the zones once for the whole list, from the diff own worktree', () => {
    render()

    expect(captured.worktreeIds).toEqual(['wt-1'])
  })
})
