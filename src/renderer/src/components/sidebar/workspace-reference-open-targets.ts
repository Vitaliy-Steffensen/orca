import { getWorkspaceAttachments } from '../../../../shared/workspace-attachments'
import { getWorkspaceAttachmentKey } from '../../../../shared/workspace-attachment-normalization'
import { buildLinearIssueUrl } from '../../../../shared/linear/links'
import type { WorkspaceAttachment, Worktree } from '../../../../shared/worktree/types'
import {
  workspaceAttachmentLabel,
  workspaceAttachmentProviderLabel
} from './worktree-attachment-editing'

export type WorkspaceReferenceOpenTarget = {
  key: string
  provider: WorkspaceAttachment['provider']
  type: WorkspaceAttachment['type']
  label: string
  url: string
}

function referenceUrl(item: WorkspaceAttachment): string | null {
  if (item.url) {
    return item.url
  }
  if (item.provider === 'linear') {
    return buildLinearIssueUrl({
      identifier: item.identifier ?? item.linearIdentifier,
      organizationUrlKey: item.linearOrganizationUrlKey
    })
  }
  return null
}

/** Linked issues and reviews the workspace can hand to a browser, reviews first. */
export function getWorkspaceReferenceOpenTargets(
  workspace: Worktree | undefined
): WorkspaceReferenceOpenTarget[] {
  if (!workspace) {
    return []
  }
  const targets: WorkspaceReferenceOpenTarget[] = []
  const seen = new Set<string>()
  for (const item of getWorkspaceAttachments(workspace)) {
    const url = referenceUrl(item)
    if (!url || seen.has(url)) {
      continue
    }
    seen.add(url)
    targets.push({
      key: getWorkspaceAttachmentKey(item),
      provider: item.provider,
      type: item.type,
      label: `${workspaceAttachmentProviderLabel(item)} ${workspaceAttachmentLabel(item)}`,
      url
    })
  }
  return targets.sort((a, b) => Number(a.type === 'issue') - Number(b.type === 'issue'))
}
