import { describe, expect, it, vi } from 'vitest'
import { FileFindModeSwitch } from './FileFindModeSwitch'
import { visit, type ReactElementLike } from '../file-explorer-element-tree-test-harness'

function findElementByAriaLabel(node: unknown, ariaLabel: string): ReactElementLike {
  let found: ReactElementLike | null = null
  visit(node, (entry) => {
    if (entry.props['aria-label'] === ariaLabel) {
      found = entry
    }
  })
  if (!found) {
    throw new Error(`${ariaLabel} element not found`)
  }
  return found
}

describe('FileFindModeSwitch', () => {
  it('switches between names and contents modes', () => {
    const onSelectMode = vi.fn()
    const element = FileFindModeSwitch({ mode: 'names', onSelectMode })

    const switchRoot = findElementByAriaLabel(element, 'Explorer search mode')
    const onValueChange = switchRoot.props.onValueChange
    if (typeof onValueChange !== 'function') {
      throw new Error('mode switch is missing its value handler')
    }
    onValueChange('contents')

    expect(onSelectMode).toHaveBeenCalledWith('contents')
  })

  it('renders names and contents labels', () => {
    const element = FileFindModeSwitch({ mode: 'contents', onSelectMode: vi.fn() })

    const contentsTab = findElementByAriaLabel(element, 'Search file contents')
    const namesTab = findElementByAriaLabel(element, 'Filter files by name')
    const switchRoot = findElementByAriaLabel(element, 'Explorer search mode')

    expect(switchRoot.props.value).toBe('contents')
    expect(contentsTab.props.value).toBe('contents')
    expect(namesTab.props.value).toBe('names')
    expect(JSON.stringify(contentsTab.props.children)).toContain('Contents')
    expect(JSON.stringify(namesTab.props.children)).toContain('Names')
  })
})
