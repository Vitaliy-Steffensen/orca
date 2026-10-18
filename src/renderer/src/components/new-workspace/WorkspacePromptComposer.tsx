import { useRef } from 'react'
import { LoaderCircle } from 'lucide-react'
import { NativeChatPromptEditor } from '@/components/native-chat/NativeChatPromptEditor'
import { NativeChatSessionOptionPickers } from '@/components/native-chat/NativeChatSessionOptionPickers'
import type { NativeChatComposerInput } from '@/components/native-chat/native-chat-composer-input'
import { Button } from '@/components/ui/button'
import { ButtonKeyHint } from '@/components/ButtonKeyHint'
import { useImeEnterGestureOwnership } from '@/lib/ime-composition-keyboard-event'
import { cn } from '@/lib/utils'
import type { useWorkspacePromptSessionOptions } from './use-workspace-prompt-session-options'

type PlanMode = ReturnType<typeof useWorkspacePromptSessionOptions>

/**
 * The same prompt editor, plan-mode switch, and session-option picker the chat
 * composer uses. Enter creates; Shift+Enter stays a newline; Shift+Tab is plan mode.
 */
export function WorkspacePromptComposer({
  prompt,
  onPromptChange,
  onSubmit,
  disabled,
  creating,
  actionLabel,
  placeholder,
  hint,
  planMode
}: {
  prompt: string
  onPromptChange: (value: string) => void
  onSubmit: () => void
  disabled: boolean
  creating: boolean
  actionLabel: string
  placeholder: string
  hint: string | null
  planMode: PlanMode
}): React.JSX.Element {
  const inputRef = useRef<NativeChatComposerInput | null>(null)
  const imeEnterGesture = useImeEnterGestureOwnership()
  return (
    <div className="space-y-1.5">
      <div data-workspace-prompt-input="true">
        <NativeChatPromptEditor
          inputRef={inputRef}
          initialValue={prompt}
          disabled={disabled || creating}
          placeholder={placeholder}
          onChange={(input) => onPromptChange(input.value)}
          onSelect={() => {}}
          onKeyDownCapture={(event) => {
            if (imeEnterGesture.ownsKeyDown(event)) {
              return
            }
            if (event.nativeEvent.isComposing || event.keyCode === 229) {
              return
            }
            if (event.key === 'Tab' && event.shiftKey && planMode.togglePlanMode()) {
              event.preventDefault()
              return
            }
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              if (!disabled && !creating) {
                onSubmit()
              }
            }
          }}
          onKeyUp={imeEnterGesture.onKeyUp}
          className={cn(
            'min-h-28 w-full bg-transparent px-0.5 py-1 text-sm text-chat-foreground-strong outline-none',
            'max-h-[calc(8lh+0.5rem)] overflow-y-auto scrollbar-sleek',
            'placeholder:text-chat-foreground-faint'
          )}
        />
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <NativeChatSessionOptionPickers
            surface={planMode.surface}
            snapshot={planMode.snapshot}
            isWorking={false}
            focusComposer={() => inputRef.current?.focus()}
          />
          <Button
            type="button"
            size="sm"
            className="text-xs"
            disabled={disabled || creating}
            onClick={onSubmit}
          >
            {creating ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {actionLabel}
            <ButtonKeyHint />
          </Button>
        </div>
      </div>
      {hint ? <p className="px-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
