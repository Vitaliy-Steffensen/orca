import { afterEach, describe, expect, it } from 'vitest'
import {
  changesFilterBadge,
  clearChangesFilter,
  getChangesFilter,
  isUncommittedOnly,
  isUnstagedOnly,
  setChangesFilter,
  syncLatestAgentTurn,
  toggleUncommittedOnly,
  toggleUnstagedOnly,
  type ChangesFilter
} from './changes-filter'

const commit: ChangesFilter = {
  kind: 'commit',
  compare: {
    commitOid: 'c'.repeat(40),
    parentOid: 'p'.repeat(40),
    compareRef: 'ccccccc',
    baseRef: 'ppppppp'
  },
  entries: [{ path: 'a.ts', status: 'modified' }],
  subject: 'Fix it'
}

function turn(oid: string, latest: boolean): ChangesFilter {
  return {
    kind: 'turn',
    compare: {
      commitOid: oid,
      parentOid: 's'.repeat(40),
      compareRef: oid.slice(0, 7),
      baseRef: 'sssssss'
    },
    entries: [{ path: 'b.ts', status: 'added' }],
    prompt: 'Do the thing',
    latest
  }
}

afterEach(() => clearChangesFilter('wt'))

describe('changes filter', () => {
  it('holds one filter per workspace, so Uncommitted and a turn or commit replace each other', () => {
    setChangesFilter('wt', commit)
    toggleUncommittedOnly('wt')
    expect(isUncommittedOnly('wt')).toBe(true)
    expect(getChangesFilter('wt')).toEqual({ kind: 'uncommitted' })

    setChangesFilter('wt', turn('t'.repeat(40), true))
    expect(isUncommittedOnly('wt')).toBe(false)
    expect(getChangesFilter('other')).toBeNull()

    toggleUncommittedOnly('wt')
    toggleUncommittedOnly('wt')
    expect(getChangesFilter('wt')).toBeNull()
  })

  it('replaces Uncommitted with Unstaged, and toggling Unstaged again shows every change', () => {
    toggleUncommittedOnly('wt')
    toggleUnstagedOnly('wt')
    expect(isUncommittedOnly('wt')).toBe(false)
    expect(isUnstagedOnly('wt')).toBe(true)
    expect(getChangesFilter('wt')).toEqual({ kind: 'unstaged' })
    toggleUnstagedOnly('wt')
    expect(getChangesFilter('wt')).toBeNull()
  })

  it('names each filter for its badge', () => {
    expect(changesFilterBadge(null)).toBeNull()
    expect(changesFilterBadge({ kind: 'uncommitted' })).toEqual({ label: 'Uncommitted' })
    expect(changesFilterBadge({ kind: 'unstaged' })).toEqual({ label: 'Unstaged' })
    expect(changesFilterBadge(turn('t'.repeat(40), true))).toEqual({
      label: 'Latest turn',
      title: 'Do the thing'
    })
    expect(changesFilterBadge(turn('t'.repeat(40), false))?.label).toBe('Historical changes')
    expect(changesFilterBadge(commit)).toEqual({ label: 'Commit ccccccc', title: 'Fix it' })
  })

  it('calls a previewed turn historical once a newer turn lands', () => {
    setChangesFilter('wt', turn('t'.repeat(40), true))
    syncLatestAgentTurn('wt', 't'.repeat(40))
    expect(getChangesFilter('wt')).toMatchObject({ latest: true })
    syncLatestAgentTurn('wt', 'n'.repeat(40))
    expect(getChangesFilter('wt')).toMatchObject({ latest: false })
  })
})
