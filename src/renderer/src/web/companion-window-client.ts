import { COMPANION_USER_AGENT_TOKEN } from '../../../shared/companion-window-user-agent'

export function isCompanionWindowClient(): boolean {
  return (
    typeof navigator !== 'undefined' && navigator.userAgent.includes(COMPANION_USER_AGENT_TOKEN)
  )
}
