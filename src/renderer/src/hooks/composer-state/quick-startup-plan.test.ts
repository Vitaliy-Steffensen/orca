import { describe, expect, it } from 'vitest'
import { buildQuickComposerStartup } from './quick-startup-plan'

describe('quick composer terminal model', () => {
  it.each([null, 'Review this change'])(
    'passes a chosen model through a terminal launch with draft %s',
    (draftPrompt) => {
      const { startupPlan } = buildQuickComposerStartup({
        agent: 'claude',
        prompt: 'Explain this',
        draftPrompt,
        settings: null,
        launchHost: { kind: 'known', platform: 'linux', hostKind: 'ssh' },
        shell: undefined,
        isRemote: true,
        telemetrySource: 'unknown',
        sessionOptions: { model: 'opus' }
      })
      expect(startupPlan?.launchCommand).toContain("'--model' 'opus'")
    }
  )
})
