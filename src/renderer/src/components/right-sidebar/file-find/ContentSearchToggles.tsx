import React from 'react'
import { CaseSensitive, Regex, WholeWord } from 'lucide-react'
import { ToggleButton } from '../SearchResultItems'
import { translate } from '@/i18n/i18n'

/** The Contents-mode half of the find bar: the ripgrep query plus its matching options. */
export type ContentSearchFieldProps = {
  inputRef: React.RefObject<HTMLInputElement | null>
  query: string
  loading: boolean
  caseSensitive: boolean
  wholeWord: boolean
  useRegex: boolean
  onQueryChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onClearSearch: () => void
  onToggleCaseSensitive: () => void
  onToggleWholeWord: () => void
  onToggleRegex: () => void
}

export function ContentSearchToggles({
  caseSensitive,
  wholeWord,
  useRegex,
  onToggleCaseSensitive,
  onToggleWholeWord,
  onToggleRegex
}: Pick<
  ContentSearchFieldProps,
  | 'caseSensitive'
  | 'wholeWord'
  | 'useRegex'
  | 'onToggleCaseSensitive'
  | 'onToggleWholeWord'
  | 'onToggleRegex'
>): React.JSX.Element {
  return (
    <>
      <ToggleButton
        active={caseSensitive}
        onClick={onToggleCaseSensitive}
        title={translate('auto.components.right.sidebar.SearchHeader.464ae3974f', 'Match Case')}
      >
        <CaseSensitive className="size-3.5" />
      </ToggleButton>
      <ToggleButton
        active={wholeWord}
        onClick={onToggleWholeWord}
        title={translate(
          'auto.components.right.sidebar.SearchHeader.4567e6e0b6',
          'Match Whole Word'
        )}
      >
        <WholeWord className="size-3.5" />
      </ToggleButton>
      <ToggleButton
        active={useRegex}
        onClick={onToggleRegex}
        title={translate(
          'auto.components.right.sidebar.SearchHeader.6234a5ef85',
          'Use Regular Expression'
        )}
      >
        <Regex className="size-3.5" />
      </ToggleButton>
    </>
  )
}
