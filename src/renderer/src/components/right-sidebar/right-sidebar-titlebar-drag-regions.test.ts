import { describe, expect, it } from 'vitest'
import {
  RIGHT_SIDEBAR_HEADER_NO_DRAG_CLASS_NAME,
  RIGHT_SIDEBAR_TOP_ACTIVITY_STRIP_CLASS_NAME
} from './right-sidebar-titlebar-drag-regions'

describe('right sidebar titlebar drag regions', () => {
  it('leaves the drag decision to the caller rather than baking it into the strip', () => {
    expect(RIGHT_SIDEBAR_TOP_ACTIVITY_STRIP_CLASS_NAME).not.toContain(
      RIGHT_SIDEBAR_HEADER_NO_DRAG_CLASS_NAME
    )
  })
})
