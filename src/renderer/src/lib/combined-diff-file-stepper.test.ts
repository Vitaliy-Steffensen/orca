import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerCombinedDiffFileStepper, stepCombinedDiffFile } from './combined-diff-file-stepper'
import { createStepToChangedFile } from '@/store/slices/editor/actions/step-to-changed-file'

const cleanups: (() => void)[] = []
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
})

describe('combined diff file stepper', () => {
  it('lets the combined view on screen take a file step, and passes when none does', () => {
    expect(stepCombinedDiffFile('next')).toBe(false)
    const declines = vi.fn(() => false)
    const takes = vi.fn(() => true)
    cleanups.push(registerCombinedDiffFileStepper(declines), registerCombinedDiffFileStepper(takes))
    expect(stepCombinedDiffFile('previous')).toBe(true)
    expect(takes).toHaveBeenCalledWith('previous')
  })

  it('steps within the combined view instead of opening the next file in its own tab', () => {
    const getKnownWorktreeById = vi.fn()
    const get = vi.fn(() => ({
      openFiles: [],
      activeFileId: null,
      activeWorktreeId: 'wt',
      getKnownWorktreeById
    }))
    const { stepToChangedFile } = createStepToChangedFile(vi.fn(), get as never)
    cleanups.push(registerCombinedDiffFileStepper(() => true))
    stepToChangedFile('next')
    expect(getKnownWorktreeById).not.toHaveBeenCalled()
  })
})
