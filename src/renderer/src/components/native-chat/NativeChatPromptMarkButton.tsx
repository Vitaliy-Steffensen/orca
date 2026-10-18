import { ChevronDown, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import type { NativeChatPromptMark } from '../../../../shared/native-chat-prompt-marks'

const OFF = ''

export function NativeChatPromptMarkButton(props: {
  marks: readonly NativeChatPromptMark[]
  activeId: string | null
  disabled?: boolean
  onChange: (id: string | null) => void
}): React.JSX.Element | null {
  const usable = props.marks.filter((mark) => mark.prompt.trim() !== '')
  if (usable.length === 0) {
    return null
  }
  const active = usable.find((mark) => mark.id === props.activeId) ?? null
  const label = active
    ? translate('components.native-chat.composer.promptMarkOn', 'Prompt mark: {{value0}}', {
        value0: active.name || active.id
      })
    : translate('components.native-chat.composer.promptMark', 'Mark this message')
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild disabled={props.disabled}>
            <Button
              type="button"
              variant={active ? 'secondary' : 'ghost'}
              size={active ? 'xs' : 'icon-sm'}
              aria-label={label}
              className="pointer-coarse:size-11"
            >
              <Sparkles className="size-3.5" />
              {active ? <span className="max-w-28 truncate">{active.name}</span> : null}
              {active ? <ChevronDown className="size-3" /> : null}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4}>
          {active
            ? label
            : translate(
                'components.native-chat.composer.promptMarkHint',
                'Attach an instruction from Settings. Separate from Ask mode.'
              )}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuLabel>
          {translate('components.native-chat.composer.promptMarkMenu', 'Prompt mark')}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={active?.id ?? OFF}
          onValueChange={(value) => props.onChange(value === OFF ? null : value)}
        >
          <DropdownMenuRadioItem value={OFF}>
            {translate('components.native-chat.composer.promptMarkOff', 'Off')}
          </DropdownMenuRadioItem>
          {usable.map((mark) => (
            <DropdownMenuRadioItem key={mark.id} value={mark.id}>
              {mark.name || mark.id}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
