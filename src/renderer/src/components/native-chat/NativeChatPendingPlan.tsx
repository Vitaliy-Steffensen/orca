import { translate } from '@/i18n/i18n'
import { NativeChatMarkdown } from './NativeChatMarkdown'
import { NativeChatCodeBlock } from './NativeChatCodeBlock'
import type { CommentMarkdownLinkClickHandler } from '@/components/sidebar/CommentMarkdown'
import type { AgentJournalPlanApprovalSubject } from '../../../../shared/agent-session-journal-types'

/**
 * A plan still waiting on the user, drawn as ordinary transcript content rather than inside a
 * card: it is the longest thing an agent writes, and a card's own scroll box buried it. The
 * composer carries the decision while this is on screen.
 */
export function NativeChatPendingPlan({
  subject,
  onLinkClick,
  allowFileUriLinks
}: {
  subject: AgentJournalPlanApprovalSubject
  onLinkClick?: CommentMarkdownLinkClickHandler
  allowFileUriLinks: boolean
}): React.JSX.Element {
  return (
    <div data-native-chat-pending-plan="true">
      <NativeChatMarkdown
        content={subject.text}
        variant="document"
        className="text-sm text-chat-foreground"
        renderCodeBlock={NativeChatCodeBlock}
        {...(onLinkClick ? { onLinkClick } : {})}
        allowFileUriLinks={allowFileUriLinks}
        linkifyFilePaths={onLinkClick !== undefined}
      />
      {subject.filePath ? (
        <p className="mt-2 break-all text-xs text-chat-foreground-faint">
          <span className="font-medium">
            {translate('components.native-chat.approval.plan.file', 'Plan file')}:{' '}
          </span>
          <span className="font-mono">{subject.filePath}</span>
        </p>
      ) : null}
    </div>
  )
}
