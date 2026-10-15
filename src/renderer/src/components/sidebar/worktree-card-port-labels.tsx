import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { useWorktreePortLabels, type PortLabel } from '@/lib/workspace-port-labels'
import type { WorkspacePort } from '../../../../shared/workspace-ports'

/** Fork: the names the workspace's repo gives its live ports, from the repo's URLs command. */
export function useWorkspacePortLabels(ports: readonly WorkspacePort[]): PortLabel[] {
  const owner = ports.find(
    (port): port is Extract<WorkspacePort, { kind: 'workspace' }> => port.kind === 'workspace'
  )?.owner
  const command = useAppStore((s) =>
    owner ? s.repos?.find((repo) => repo.id === owner.repoId)?.portLabelsCommand : undefined
  )
  const portKey = ports.map((port) => port.port).join(',')
  const livePorts = useMemo(() => (portKey ? portKey.split(',').map(Number) : []), [portKey])
  return useWorktreePortLabels(owner?.worktreeId ?? null, owner?.path ?? null, command, livePorts)
}
