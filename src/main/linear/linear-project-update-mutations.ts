import { LINEAR_WRITE_BODY_CAP } from '../../shared/linear/agent-access'
import { acquire, release } from './linear-request-concurrency'
import { clearToken } from './linear-token-store'
import { getClients, isAuthError } from './client'
import { LinearAgentAccessError, linearError } from './issue-context-errors'

const PROJECT_UPDATE_CREATE_MUTATION = `
  mutation OrcaLinearProjectUpdateCreate($input: ProjectUpdateCreateInput!) {
    projectUpdateCreate(input: $input) {
      success
      projectUpdate {
        id
        body
        health
        url
      }
    }
  }
`

export type ProjectUpdateHealth = 'onTrack' | 'atRisk' | 'offTrack'

export type ProjectUpdateCreateResult = {
  id: string
  body: string
  health: string | null
  url: string | null
}

type ProjectUpdateCreateResponse = {
  projectUpdateCreate?: {
    success?: boolean
    projectUpdate?: {
      id: string
      body?: string | null
      health?: string | null
      url?: string | null
    } | null
  } | null
}

export async function createProjectUpdate(input: {
  projectId: string
  body: string
  health?: ProjectUpdateHealth
  workspaceId?: string | null
}): Promise<ProjectUpdateCreateResult> {
  if (input.body.length > LINEAR_WRITE_BODY_CAP) {
    throw linearError('linear_body_too_large', 'Linear project update body is too large.')
  }
  const projectId = input.projectId.trim()
  if (!projectId) {
    throw linearError('linear_invalid_project', 'Project ID is required.')
  }
  const entry = getClients(input.workspaceId ?? undefined)[0]
  if (!entry) {
    throw linearError('linear_not_connected', 'Not connected to Linear.')
  }
  await acquire()
  try {
    const result = await entry.client.client.rawRequest<
      ProjectUpdateCreateResponse,
      { input: { projectId: string; body: string; health?: ProjectUpdateHealth } }
    >(PROJECT_UPDATE_CREATE_MUTATION, {
      input: {
        projectId,
        body: input.body,
        ...(input.health ? { health: input.health } : {})
      }
    })
    const payload = result.data?.projectUpdateCreate
    const update = payload?.projectUpdate
    if (!payload?.success || !update?.id) {
      throw linearError('linear_write_failed', 'Linear project update failed.')
    }
    return {
      id: update.id,
      body: update.body ?? input.body,
      health: update.health ?? null,
      url: update.url ?? null
    }
  } catch (error) {
    if (error instanceof LinearAgentAccessError) {
      throw error
    }
    if (isAuthError(error)) {
      clearToken(entry.workspace.id)
      throw linearError('linear_auth_expired', 'Linear authentication expired.')
    }
    const message = error instanceof Error ? error.message : String(error)
    throw linearError('linear_write_failed', message)
  } finally {
    release()
  }
}
