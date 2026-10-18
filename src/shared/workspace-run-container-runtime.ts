import type { WorkspaceRunQuickCommand } from './terminal-quick-command-types'

const CONTAINER_TOOL_PATTERN = /\b(docker|docker-compose|compose|orb|orbctl|podman|colima)\b/i

/** Compose files whose presence means the dev stack boots containers even when the command does not say so. */
export const WORKSPACE_RUN_COMPOSE_FILENAMES = [
  'docker-compose.yml',
  'docker-compose.yaml',
  'compose.yml',
  'compose.yaml'
] as const

export function workspaceRunMentionsContainers(command: WorkspaceRunQuickCommand): boolean {
  return command.services.some((service) => CONTAINER_TOOL_PATTERN.test(service.command))
}
