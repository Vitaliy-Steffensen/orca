import { getOptionalStringFlag } from '../flags'
import { RuntimeClientError } from '../runtime-client'

export function getAutomationKindFlag(
  flags: Map<string, string | boolean>
): 'pull_request_sync' | undefined {
  const raw = getOptionalStringFlag(flags, 'kind')
  if (!raw || raw === 'agent_prompt' || raw === 'agent-prompt') {
    return undefined
  }
  if (raw === 'pull_request_sync' || raw === 'pull-request-sync') {
    return 'pull_request_sync'
  }
  throw new RuntimeClientError(
    'invalid_argument',
    `Unknown automation kind: ${raw}. Use agent-prompt or pull-request-sync.`
  )
}
