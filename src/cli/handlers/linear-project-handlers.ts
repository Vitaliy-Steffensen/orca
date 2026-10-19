import type {
  LinearProjectListRequest,
  LinearProjectListResult
} from '../../shared/linear/agent-access'
import { clampLinearSearchLimit } from '../../shared/linear/agent-access'
import type { CommandHandler } from '../dispatch'
import { printResult } from '../format'
import { RuntimeClientError } from '../runtime-client'
import {
  getOptionalPositiveIntegerFlag,
  getOptionalStringFlag,
  getRequiredStringFlag
} from '../flags'
import { readLinearBody } from '../linear-request-builders'
import {
  formatLinearProjectList,
  formatLinearProjectShow,
  formatLinearProjectUpdate,
  printLinearProjectListWarnings
} from '../linear-format'

export const LINEAR_PROJECT_HANDLERS: Record<string, CommandHandler> = {
  'linear project list': async ({ flags, client, json }) => {
    const limit = clampLinearSearchLimit(getOptionalPositiveIntegerFlag(flags, 'limit'))
    const lead = getOptionalStringFlag(flags, 'lead')
    if (lead && lead !== 'me') {
      throw new RuntimeClientError('invalid_argument', '--lead only accepts me')
    }
    const request: LinearProjectListRequest = {
      query: getOptionalStringFlag(flags, 'query'),
      limit,
      workspaceId: getOptionalStringFlag(flags, 'workspace'),
      ...(lead === 'me' ? { lead: 'me' as const } : {})
    }
    const response = await client.call<LinearProjectListResult>('linear.agentProjectList', request)
    if (!json) {
      printLinearProjectListWarnings(response.result)
    }
    printResult(response, json, formatLinearProjectList)
  },
  'linear project show': async ({ flags, client, json }) => {
    const response = await client.call<{
      id: string
      name: string
      url?: string
      health?: string | null
      description?: string
    } | null>('linear.showProject', {
      id: getRequiredStringFlag(flags, 'id'),
      workspaceId: getOptionalStringFlag(flags, 'workspace')
    })
    printResult(response, json, formatLinearProjectShow)
  },
  'linear project update post': async ({ flags, client, cwd, json }) => {
    const health = getOptionalStringFlag(flags, 'health')
    if (health && health !== 'onTrack' && health !== 'atRisk' && health !== 'offTrack') {
      throw new RuntimeClientError(
        'invalid_argument',
        '--health must be onTrack, atRisk, or offTrack'
      )
    }
    const body = await readLinearBody(flags, cwd, { required: true })
    const response = await client.call<{
      id: string
      health: string | null
      url: string | null
    }>('linear.createProjectUpdate', {
      projectId: getRequiredStringFlag(flags, 'project'),
      body,
      ...(health ? { health } : {}),
      workspaceId: getOptionalStringFlag(flags, 'workspace')
    })
    printResult(response, json, formatLinearProjectUpdate)
  }
}
