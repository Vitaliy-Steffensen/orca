import { describe, expect, it } from 'vitest'
import { overlayLaunchSeed } from './launch-structured-agent-session'

describe('overlayLaunchSeed', () => {
  it('keeps the saved model and applies plan mode on top', () => {
    expect(
      overlayLaunchSeed({ model: 'gpt-5.4', permissionMode: 'default' }, { permissionMode: 'plan' })
    ).toEqual({ model: 'gpt-5.4', permissionMode: 'plan' })
  })

  it('leaves the saved seed alone when nothing was picked', () => {
    expect(overlayLaunchSeed({ model: 'gpt-5.4' }, undefined)).toEqual({ model: 'gpt-5.4' })
    expect(overlayLaunchSeed(undefined, {})).toBeUndefined()
  })
})
