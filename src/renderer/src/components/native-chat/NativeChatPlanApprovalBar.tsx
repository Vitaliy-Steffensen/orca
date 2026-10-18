import { Button } from '@/components/ui/button'
import { ShortcutKeyCombo } from '@/components/ShortcutKeyCombo'
import { translate } from '@/i18n/i18n'
import { NativeChatCopyButton } from './NativeChatCopyButton'
import { isMacPlatform } from './native-chat-shortcut'
import type { NativeChatPlanApproval } from './use-native-chat-plan-approval'

/** Approve keys match the handler in `use-native-chat-composer-keydown`. */
export function planApprovalShortcutKeys(): string[] {
  return isMacPlatform() ? ['⌘', '⇧', '↵'] : ['Ctrl', 'Shift', '↵']
}

/**
 * The plan decision, carried on the composer rather than in a card: the plan itself is transcript
 * content, and what is left is one affirmative action plus the field below for what to change.
 * There is no reject button on purpose — typing adjustments and sending is the revision path.
 */
export function NativeChatPlanApprovalBar({
  plan
}: {
  plan: NativeChatPlanApproval
}): React.JSX.Element {
  return (
    <div
      className="flex items-center justify-end gap-1 px-1 pb-1.5"
      data-native-chat-plan-approval-bar="true"
    >
      <NativeChatCopyButton
        text={plan.planText}
        label={translate('components.native-chat.plan.copy', 'Copy plan')}
      />
      {plan.acceptsNote ? null : (
        // This host takes no adjustments with the denial, so the way back to planning has to be a
        // button rather than what the user types.
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={plan.keepPlanning}
          disabled={plan.isSubmitting}
        >
          {translate('components.native-chat.plan.keepPlanning', 'Keep planning')}
        </Button>
      )}
      <Button type="button" size="sm" onClick={plan.approve} disabled={plan.isSubmitting}>
        {translate('components.native-chat.plan.approve', 'Approve')}
        <ShortcutKeyCombo
          keys={planApprovalShortcutKeys()}
          keyCapClassName="border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground"
        />
      </Button>
    </div>
  )
}
