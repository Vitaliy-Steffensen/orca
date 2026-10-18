import { RuntimeClientError } from '../runtime-client'
import { rejectValuelessFlag } from '../flags'
import {
  WORKSPACE_INTENT_VALUES,
  isWorkspaceIntentValue,
  type WorkspaceIntent
} from '../../shared/workspace-intent'

/**
 * `--intent task|question|null` as `worktree.set`'s `workspaceIntent`.
 * Absent leaves it unchanged; literal `null` clears it back to unset (which reads as task).
 */
export function getOptionalWorkspaceIntentFlag(
  flags: Map<string, string | boolean>
): WorkspaceIntent | null | undefined {
  const value = flags.get('intent')
  rejectValuelessFlag(value, 'intent')
  if (typeof value !== 'string' || value.length === 0) {
    return undefined
  }
  const normalized = value.trim().toLowerCase()
  if (normalized === 'null') {
    return null
  }
  if (isWorkspaceIntentValue(normalized)) {
    return normalized
  }
  throw new RuntimeClientError(
    'invalid_argument',
    `--intent accepts ${WORKSPACE_INTENT_VALUES.join(', ')} or null.`
  )
}
