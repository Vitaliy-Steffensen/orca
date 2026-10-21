import { useCallback } from 'react'
import { useAppStore } from '@/store'
import { getWorkspaceStatusSectionFromGroupKey } from '../../../../../../shared/workspace-status-sections'
import { getWorkspaceStatusFromGroupKey } from '../../workspace-status'
import { WORKSPACE_STATUS_SECTION_BUCKET } from '../../workspace-status-header-drop'

/**
 * Turns a dropped order of sidebar row keys into the two writes that persist it:
 * band keys become the band order, lane keys become that band's lane order.
 */
export function useWorkspaceStatusHeaderOrderCommit(args: {
  beforeCommit: () => void
}): (bucketKey: string, orderedHeaderKeys: readonly string[]) => void {
  const setWorkspaceStatusSectionOrder = useAppStore((s) => s.setWorkspaceStatusSectionOrder)
  const setWorkspaceStatusLaneOrder = useAppStore((s) => s.setWorkspaceStatusLaneOrder)
  const { beforeCommit } = args
  return useCallback(
    (bucketKey, orderedHeaderKeys) => {
      if (bucketKey === WORKSPACE_STATUS_SECTION_BUCKET) {
        const sections = orderedHeaderKeys
          .map((key) => getWorkspaceStatusSectionFromGroupKey(key))
          .filter((section): section is string => section !== null)
        if (sections.length === 0) {
          return
        }
        beforeCommit()
        setWorkspaceStatusSectionOrder(sections)
        return
      }
      const section = getWorkspaceStatusSectionFromGroupKey(bucketKey)
      if (section === null) {
        return
      }
      const statuses = useAppStore.getState().workspaceStatuses
      const laneIds = orderedHeaderKeys
        .map((key) => getWorkspaceStatusFromGroupKey(key, statuses))
        .filter((id): id is string => id !== null)
      if (laneIds.length === 0) {
        return
      }
      beforeCommit()
      setWorkspaceStatusLaneOrder(section, laneIds)
    },
    [beforeCommit, setWorkspaceStatusLaneOrder, setWorkspaceStatusSectionOrder]
  )
}
