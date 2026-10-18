import { useRef } from 'react'
import { createBrowserUuid } from '@/lib/browser-uuid'
import { Trash2 } from 'lucide-react'
import type { GlobalSettings } from '../../../../shared/global-settings-types'
import {
  MAX_NATIVE_CHAT_PROMPT_MARKS,
  type NativeChatPromptMark,
  type NativeChatPromptMarkPlacement,
  normalizeNativeChatPromptMarks
} from '../../../../shared/native-chat-prompt-marks'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '../../store'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { SearchableSetting } from './SearchableSetting'
import { SettingsSegmentedControl, SettingsSubsectionHeader } from './SettingsFormControls'
import { getChatPromptMarksSearchEntry, getChatPromptMarksTitle } from './chat-prompt-marks-search'
import { matchesSettingsSearch } from './settings-search'
import { useDebouncedSettingsTextDraft } from './use-debounced-settings-text-draft'

type NativeChatPromptMarksSettingProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
  forceVisible?: boolean
}

function newPromptMarkId(): string {
  return createBrowserUuid()
}

export function NativeChatPromptMarksSetting({
  settings,
  updateSettings,
  forceVisible = false
}: NativeChatPromptMarksSettingProps): React.JSX.Element | null {
  const query = useAppStore((state) => state.settingsSearchQuery)
  const entry = getChatPromptMarksSearchEntry()
  const visible =
    forceVisible || matchesSettingsSearch(query, [entry, { title: getChatPromptMarksTitle() }])
  if (!visible) {
    return null
  }
  const marks = normalizeNativeChatPromptMarks(settings.nativeChatPromptMarks)
  const write = (next: NativeChatPromptMark[]): void => {
    updateSettings({ nativeChatPromptMarks: next })
  }
  const updateMark = (id: string, patch: Partial<NativeChatPromptMark>): void => {
    write(marks.map((mark) => (mark.id === id ? { ...mark, ...patch } : mark)))
  }

  return (
    <section id="chat-prompt-marks" className="space-y-3">
      <SettingsSubsectionHeader title={getChatPromptMarksTitle()} />
      <SearchableSetting
        {...entry}
        id={entry.targetSectionId}
        forceVisible={forceVisible}
        className="max-w-none"
      >
        <Card>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">{entry.description}</p>
            {marks.map((mark) => (
              <PromptMarkEditor
                key={mark.id}
                mark={mark}
                onChange={(patch) => updateMark(mark.id, patch)}
                onRemove={() => write(marks.filter((item) => item.id !== mark.id))}
              />
            ))}
            {marks.length < MAX_NATIVE_CHAT_PROMPT_MARKS ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  write([
                    ...marks,
                    {
                      id: newPromptMarkId(),
                      name: translate(
                        'components.settings.nativeChat.promptMarksNewName',
                        'New mark'
                      ),
                      prompt: '',
                      placement: 'prefix'
                    }
                  ])
                }
              >
                {translate('components.settings.nativeChat.promptMarksAdd', 'Add prompt mark')}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </SearchableSetting>
    </section>
  )
}

function PromptMarkEditor(props: {
  mark: NativeChatPromptMark
  onChange: (patch: Partial<NativeChatPromptMark>) => void
  onRemove: () => void
}): React.JSX.Element {
  const { mark, onChange, onRemove } = props
  // The latest typed text, so a name commit and an instruction commit in the same
  // moment both land instead of the second write restoring the other field.
  const nameRef = useRef(mark.name)
  const promptRef = useRef(mark.prompt)
  const name = useDebouncedSettingsTextDraft({
    value: mark.name,
    commit: (next) => {
      nameRef.current = next
      onChange({ name: next, prompt: promptRef.current })
    }
  })
  const prompt = useDebouncedSettingsTextDraft({
    value: mark.prompt,
    commit: (next) => {
      promptRef.current = next
      onChange({ name: nameRef.current, prompt: next })
    }
  })
  const nameLabel = translate('components.settings.nativeChat.promptMarksName', 'Name')
  const promptLabel = translate('components.settings.nativeChat.promptMarksPrompt', 'Instruction')
  const placementLabel = translate(
    'components.settings.nativeChat.promptMarksPlacement',
    'Where it goes'
  )
  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-2">
        <Input
          aria-label={nameLabel}
          value={name.value}
          maxLength={40}
          onChange={(event) => {
            nameRef.current = event.target.value
            name.onChange(event.target.value)
          }}
          onBlur={name.onBlur}
        />
        <SettingsSegmentedControl<NativeChatPromptMarkPlacement>
          ariaLabel={placementLabel}
          size="sm"
          value={mark.placement}
          onChange={(placement) => {
            name.onBlur()
            prompt.onBlur()
            onChange({ name: nameRef.current, prompt: promptRef.current, placement })
          }}
          options={[
            {
              value: 'prefix',
              label: translate('components.settings.nativeChat.promptMarksBefore', 'Before'),
              ariaLabel: translate(
                'components.settings.nativeChat.promptMarksBeforeAria',
                'Put the instruction before your message'
              )
            },
            {
              value: 'suffix',
              label: translate('components.settings.nativeChat.promptMarksAfter', 'After'),
              ariaLabel: translate(
                'components.settings.nativeChat.promptMarksAfterAria',
                'Put the instruction after your message'
              )
            }
          ]}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={translate(
            'components.settings.nativeChat.promptMarksRemove',
            'Remove {{value0}}',
            { value0: mark.name || promptLabel }
          )}
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <Textarea
        aria-label={promptLabel}
        value={prompt.value}
        rows={4}
        onChange={(event) => {
          promptRef.current = event.target.value
          prompt.onChange(event.target.value)
        }}
        onBlur={prompt.onBlur}
      />
    </div>
  )
}
