// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { REVEAL_FLASH_DURATION_MS } from './reveal-flash-class'
import {
  requestSourceControlRowReveal,
  useSourceControlRowReveal,
  useSourceControlRowRevealFlash,
  useSourceControlRowRevealRequestId
} from './source-control-row-reveal'

const ROW = 'unstaged::src/a.ts'

describe('source control row reveal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('reaches only the worktree and row it names', () => {
    const mine = renderHook(() => useSourceControlRowReveal('wt-1'))
    const other = renderHook(() => useSourceControlRowReveal('wt-2'))
    const flashed = renderHook(() => useSourceControlRowRevealFlash(ROW))
    const sibling = renderHook(() => useSourceControlRowRevealFlash('unstaged::src/b.ts'))

    requestSourceControlRowReveal('wt-1', ROW)
    for (const hook of [mine, other, flashed, sibling]) {
      hook.rerender()
    }

    expect(mine.result.current?.rowKey).toBe(ROW)
    expect(other.result.current).toBeNull()
    expect(flashed.result.current).toBe(true)
    expect(sibling.result.current).toBe(false)
  })

  it('clears the flash once the reveal has been seen', () => {
    const flashed = renderHook(() => useSourceControlRowRevealFlash(ROW))
    requestSourceControlRowReveal('wt-1', ROW)
    flashed.rerender()
    expect(flashed.result.current).toBe(true)

    vi.advanceTimersByTime(REVEAL_FLASH_DURATION_MS)
    flashed.rerender()
    expect(flashed.result.current).toBe(false)
  })

  it('gives a repeat press a new request id, so the scroll latch lets it through', () => {
    const requestId = renderHook(() => useSourceControlRowRevealRequestId(ROW))
    requestSourceControlRowReveal('wt-1', ROW)
    requestId.rerender()
    const first = requestId.result.current
    expect(first).toBeDefined()

    // Why the clock moves: request ids are timestamps, so a same-millisecond repeat is not a change.
    vi.advanceTimersByTime(5)
    requestSourceControlRowReveal('wt-1', ROW)
    requestId.rerender()
    expect(requestId.result.current).not.toBe(first)
  })

  it('leaves a row that is not the target with no request id', () => {
    const other = renderHook(() => useSourceControlRowRevealRequestId('unstaged::src/b.ts'))
    requestSourceControlRowReveal('wt-1', ROW)
    other.rerender()

    expect(other.result.current).toBeUndefined()
  })
})
