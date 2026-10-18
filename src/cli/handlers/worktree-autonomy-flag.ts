import { RuntimeClientError } from '../runtime-client'
import { rejectValuelessFlag } from '../flags'
import {
  WORKSPACE_AUTONOMY_VALUES,
  isWorkspaceAutonomyValue,
  type WorkspaceAutonomy
} from '../../shared/workspace-autonomy'

/**
 * `--autonomy autonomous|supervised|null` as `worktree.set`'s `workspaceAutonomy`.
 * Absent leaves it unchanged; literal `null` clears it back to unset (which reads as supervised).
 */
export function getOptionalWorkspaceAutonomyFlag(
  flags: Map<string, string | boolean>
): WorkspaceAutonomy | null | undefined {
  const value = flags.get('autonomy')
  rejectValuelessFlag(value, 'autonomy')
  if (typeof value !== 'string' || value.length === 0) {
    return undefined
  }
  const normalized = value.trim().toLowerCase()
  if (normalized === 'null') {
    return null
  }
  if (isWorkspaceAutonomyValue(normalized)) {
    return normalized
  }
  throw new RuntimeClientError(
    'invalid_argument',
    `--autonomy accepts ${WORKSPACE_AUTONOMY_VALUES.join(', ')} or null.`
  )
}
