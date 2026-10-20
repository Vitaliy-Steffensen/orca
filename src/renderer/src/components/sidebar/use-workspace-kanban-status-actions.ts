import { useCallback } from 'react'
import { useAppStore } from '@/store'
import { getWorkspaceStatus } from './workspace-status'
import { makeWorkspaceStatusId } from '../../../../shared/workspace-statuses'
import {
  assignWorkspaceStatusSection,
  moveWorkspaceStatusWithinSection,
  renameWorkspaceStatusSection,
  sanitizeWorkspaceStatusSection,
  updateWorkspaceStatusSectionAppearance
} from '../../../../shared/workspace-status-sections'
import type { Worktree } from '../../../../shared/worktree/types'

type WorkspaceStatuses = ReturnType<typeof useAppStore.getState>['workspaceStatuses']

export function useWorkspaceKanbanStatusActions(args: {
  allWorktrees: readonly Worktree[]
  workspaceStatuses: WorkspaceStatuses
  setWorkspaceStatuses: (statuses: WorkspaceStatuses) => void
  updateWorktreeMeta: ReturnType<typeof useAppStore.getState>['updateWorktreeMeta']
}) {
  const recordInteraction = (): void => {
    useAppStore.getState().recordFeatureInteraction('workspace-board-actions')
  }
  const handleRenameStatus = useCallback(
    (statusId: string, label: string) => {
      const trimmed = label.trim()
      if (!trimmed) {
        return
      }
      args.setWorkspaceStatuses(
        args.workspaceStatuses.map((status) =>
          status.id === statusId ? { ...status, label: trimmed } : status
        )
      )
      recordInteraction()
    },
    [args]
  )
  const handleChangeStatusColor = useCallback(
    (statusId: string, color: string) => {
      args.setWorkspaceStatuses(
        args.workspaceStatuses.map((status) =>
          status.id === statusId ? { ...status, color } : status
        )
      )
      recordInteraction()
    },
    [args]
  )
  const handleChangeStatusIcon = useCallback(
    (statusId: string, icon: string) => {
      args.setWorkspaceStatuses(
        args.workspaceStatuses.map((status) =>
          status.id === statusId ? { ...status, icon } : status
        )
      )
      recordInteraction()
    },
    [args]
  )
  const handleChangeStatusSection = useCallback(
    (statusId: string, section: string) => {
      args.setWorkspaceStatuses(
        assignWorkspaceStatusSection(
          args.workspaceStatuses,
          statusId,
          sanitizeWorkspaceStatusSection(section)
        )
      )
      recordInteraction()
    },
    [args]
  )
  const handleChangeSectionColor = useCallback(
    (section: string, color: string) => {
      args.setWorkspaceStatuses(
        updateWorkspaceStatusSectionAppearance(args.workspaceStatuses, section, { color })
      )
      recordInteraction()
    },
    [args]
  )
  const handleChangeSectionIcon = useCallback(
    (section: string, icon: string) => {
      args.setWorkspaceStatuses(
        updateWorkspaceStatusSectionAppearance(args.workspaceStatuses, section, { icon })
      )
      recordInteraction()
    },
    [args]
  )
  const handleRenameSection = useCallback(
    (section: string, nextName: string) => {
      args.setWorkspaceStatuses(
        renameWorkspaceStatusSection(
          args.workspaceStatuses,
          section,
          sanitizeWorkspaceStatusSection(nextName)
        )
      )
      recordInteraction()
    },
    [args]
  )
  const handleMoveStatus = useCallback(
    (statusId: string, direction: -1 | 1) => {
      args.setWorkspaceStatuses(
        moveWorkspaceStatusWithinSection(args.workspaceStatuses, statusId, direction)
      )
      recordInteraction()
    },
    [args]
  )
  const handleAddStatus = useCallback(
    (section?: string) => {
      const label = `Status ${args.workspaceStatuses.length + 1}`
      const created = { id: makeWorkspaceStatusId(label, args.workspaceStatuses), label }
      const withCreated = [...args.workspaceStatuses, created]
      args.setWorkspaceStatuses(
        section === undefined
          ? withCreated
          : assignWorkspaceStatusSection(withCreated, created.id, section)
      )
      recordInteraction()
    },
    [args]
  )
  const handleRemoveStatus = useCallback(
    (statusId: string) => {
      if (args.workspaceStatuses.length <= 1) {
        return
      }
      const index = args.workspaceStatuses.findIndex((status) => status.id === statusId)
      if (index === -1) {
        return
      }
      const next = args.workspaceStatuses.filter((status) => status.id !== statusId)
      const fallbackStatus = next[Math.min(index, next.length - 1)]?.id ?? next[0]!.id
      args.setWorkspaceStatuses(next)
      recordInteraction()
      for (const worktree of args.allWorktrees) {
        if (getWorkspaceStatus(worktree, args.workspaceStatuses) === statusId) {
          void args.updateWorktreeMeta(
            worktree.id,
            { workspaceStatus: fallbackStatus },
            { executionHostId: worktree.hostId ?? 'local' }
          )
        }
      }
    },
    [args]
  )
  return {
    handleRenameStatus,
    handleChangeStatusColor,
    handleChangeStatusIcon,
    handleChangeStatusSection,
    handleChangeSectionColor,
    handleChangeSectionIcon,
    handleRenameSection,
    handleMoveStatus,
    handleAddStatus,
    handleRemoveStatus
  }
}
