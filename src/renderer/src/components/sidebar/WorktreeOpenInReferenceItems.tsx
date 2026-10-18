import type React from 'react'
import { CircleDot, GitMerge, GitPullRequest } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { LinearIcon } from '@/components/icons/LinearIcon'
import { JiraIcon } from '@/components/icons/JiraIcon'
import type { WorkspaceReferenceOpenTarget } from './workspace-reference-open-targets'

function ReferenceIcon({ target }: { target: WorkspaceReferenceOpenTarget }): React.JSX.Element {
  if (target.provider === 'linear') {
    return <LinearIcon className="size-3.5" />
  }
  if (target.provider === 'jira') {
    return <JiraIcon className="size-3.5" />
  }
  if (target.type === 'mr') {
    return <GitMerge className="size-3.5" />
  }
  if (target.type === 'pr') {
    return <GitPullRequest className="size-3.5" />
  }
  return <CircleDot className="size-3.5" />
}

export function WorktreeOpenInReferenceItems({
  targets,
  disabled,
  onOpen
}: {
  targets: readonly WorkspaceReferenceOpenTarget[]
  disabled?: boolean
  onOpen?: (url: string) => void
}): React.JSX.Element {
  return (
    <>
      {targets.map((target) => (
        <DropdownMenuItem
          key={target.key}
          disabled={disabled}
          onClick={(event) => event.stopPropagation()}
          onSelect={() => {
            if (onOpen) {
              onOpen(target.url)
              return
            }
            void window.api.shell.openUrl(target.url)
          }}
        >
          <ReferenceIcon target={target} />
          <span className="min-w-0 truncate">{target.label}</span>
        </DropdownMenuItem>
      ))}
    </>
  )
}
