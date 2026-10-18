import { describe, expect, it, vi } from 'vitest'
import { ClaudeControlRequestError } from './claude-stream-json-connection'
import { sessionFor } from './claude-structured-dispatch-test-support'
import { leaveClaudeStructuredPlanMode } from './claude-structured-options'
import { claudeStructuredSessionOptionsFrom } from './claude-structured-session-options'
import type { ClaudeSession } from './claude-structured-session-state'

function planSession(held?: string) {
  const session = sessionFor()
  const setPermissionMode = vi.fn<ClaudeSession['connection']['setPermissionMode']>(
    async () => undefined
  )
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: supplies every connection member a permission-mode write reaches.
  session.connection = {
    ...session.connection,
    setPermissionMode,
    supportedModels: async () => []
  } as ClaudeSession['connection']
  if (held) {
    session.options.set('permissionMode', held)
  }
  return { session, setPermissionMode }
}

describe('leaveClaudeStructuredPlanMode', () => {
  it('drops the mode main holds so the pill stops naming a plan the session left', async () => {
    const { session, setPermissionMode } = planSession('plan')

    await leaveClaudeStructuredPlanMode(session)

    expect(setPermissionMode).toHaveBeenCalledWith('default', { timeoutMs: undefined })
    expect(session.options.get('permissionMode')).toBe('default')
    expect(claudeStructuredSessionOptionsFrom(session, null).current.permissionMode).toBe('default')
  })

  it('writes nothing when the session was never in plan mode', async () => {
    const untouched = planSession()
    await leaveClaudeStructuredPlanMode(untouched.session)
    expect(untouched.setPermissionMode).not.toHaveBeenCalled()

    const accepting = planSession('acceptEdits')
    await leaveClaudeStructuredPlanMode(accepting.session)
    expect(accepting.setPermissionMode).not.toHaveBeenCalled()
  })

  it('swallows a refusal: the plan is already approved, so this cannot fail the answer', async () => {
    const { session, setPermissionMode } = planSession('plan')
    setPermissionMode.mockRejectedValueOnce(
      new ClaudeControlRequestError('set_permission_mode', 'refused')
    )

    await expect(leaveClaudeStructuredPlanMode(session)).resolves.toBeUndefined()
    expect(session.options.get('permissionMode')).toBe('plan')
  })
})
