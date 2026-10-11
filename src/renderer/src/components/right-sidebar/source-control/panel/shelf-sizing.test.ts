import { describe, expect, it } from 'vitest'
import { preferredShelfHeight, shelfResizeTarget } from './shelf-sizing'

describe('preferredShelfHeight', () => {
  it('opens to the dragged height, else to half the panel', () => {
    expect(preferredShelfHeight({ stored: 180, groupHeight: 800 })).toBe(180)
    expect(preferredShelfHeight({ stored: null, groupHeight: 800 })).toBe(400)
    expect(preferredShelfHeight({ stored: null, groupHeight: 300 })).toBe(240)
  })

  it('opens a full-height shelf, like Review, to all of its content until dragged', () => {
    expect(
      preferredShelfHeight({ stored: null, groupHeight: 300, fullHeightByDefault: true })
    ).toBe(Number.POSITIVE_INFINITY)
    expect(preferredShelfHeight({ stored: 180, groupHeight: 300, fullHeightByDefault: true })).toBe(
      180
    )
    expect(
      shelfResizeTarget({
        size: 240,
        natural: 420,
        previousNatural: 0,
        preferred: Number.POSITIVE_INFINITY
      })
    ).toBe(420)
  })

  it('grows a full-height shelf with its content, like a growing summary box, until dragged', () => {
    const preferred = preferredShelfHeight({
      stored: null,
      groupHeight: 300,
      fullHeightByDefault: true
    })
    expect(shelfResizeTarget({ size: 420, natural: 480, previousNatural: 420, preferred })).toBe(
      480
    )
    expect(
      shelfResizeTarget({ size: 300, natural: 480, previousNatural: 420, preferred: 300 })
    ).toBeNull()
  })
})

describe('shelfResizeTarget', () => {
  it('opens a shelf to the height the user chose when its list expands', () => {
    expect(shelfResizeTarget({ size: 30, natural: 900, previousNatural: 30, preferred: 300 })).toBe(
      300
    )
    expect(shelfResizeTarget({ size: 30, natural: 120, previousNatural: 30, preferred: 300 })).toBe(
      120
    )
  })

  it('fits a shelf to its content when the content shrinks below it', () => {
    expect(
      shelfResizeTarget({ size: 300, natural: 30, previousNatural: 900, preferred: 300 })
    ).toBe(30)
  })

  it('leaves a shelf the user made smaller than its content alone as the content grows', () => {
    expect(
      shelfResizeTarget({ size: 200, natural: 1000, previousNatural: 900, preferred: 300 })
    ).toBeNull()
  })

  it('sizes a shelf on its first measurement', () => {
    expect(shelfResizeTarget({ size: 300, natural: 80, previousNatural: 0, preferred: 300 })).toBe(
      80
    )
  })
})
