import { CalendarClock, Eye, EyeOff, GitBranch } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import type { CmdJQuickAction } from './quick-actions'
import type { CmdJQuickActionContext } from './quick-action-context'

// Why paired actions instead of one toggle: the catalog's titles are static, so each
// direction lists only while it would actually change something.
function whenTrue(condition: boolean) {
  return condition
    ? ({ available: true } as const)
    : ({ available: false, reason: 'not-applicable' } as const)
}

export function getSidebarVisibilityQuickActions(): CmdJQuickAction[] {
  return [
    {
      id: 'show-main-workspace',
      kind: 'action',
      title: translate(
        'auto.components.cmd.j.quick.actions.showMainWorkspace',
        'Show Main Workspace'
      ),
      description: translate(
        'auto.components.cmd.j.quick.actions.showMainWorkspaceDescription',
        'List the default-branch workspace in the sidebar.'
      ),
      icon: GitBranch,
      verbKeywords: [
        translate('auto.components.cmd.j.quick.actions.verbs.showMain', 'show main'),
        translate('auto.components.cmd.j.quick.actions.verbs.main', 'main'),
        translate('auto.components.cmd.j.quick.actions.verbs.defaultBranch', 'default branch')
      ],
      isAvailable: (ctx: CmdJQuickActionContext) => whenTrue(ctx.mainWorkspaceHidden),
      run: async (ctx) => {
        ctx.setMainWorkspaceHidden(false)
        return { status: 'ok' }
      }
    },
    {
      id: 'hide-main-workspace',
      kind: 'action',
      title: translate(
        'auto.components.cmd.j.quick.actions.hideMainWorkspace',
        'Hide Main Workspace'
      ),
      description: translate(
        'auto.components.cmd.j.quick.actions.hideMainWorkspaceDescription',
        'Keep the default-branch workspace out of the sidebar.'
      ),
      icon: EyeOff,
      verbKeywords: [
        translate('auto.components.cmd.j.quick.actions.verbs.hideMain', 'hide main'),
        translate('auto.components.cmd.j.quick.actions.verbs.main', 'main'),
        translate('auto.components.cmd.j.quick.actions.verbs.defaultBranch', 'default branch')
      ],
      isAvailable: (ctx: CmdJQuickActionContext) => whenTrue(!ctx.mainWorkspaceHidden),
      run: async (ctx) => {
        ctx.setMainWorkspaceHidden(true)
        return { status: 'ok' }
      }
    },
    {
      id: 'open-automations',
      kind: 'action',
      title: translate('auto.components.cmd.j.quick.actions.openAutomations', 'Automations'),
      description: translate(
        'auto.components.cmd.j.quick.actions.openAutomationsDescription',
        'Open the automations page.'
      ),
      icon: CalendarClock,
      verbKeywords: [
        translate('auto.components.cmd.j.quick.actions.verbs.automations', 'automations'),
        translate('auto.components.cmd.j.quick.actions.verbs.schedules', 'schedules'),
        translate('auto.components.cmd.j.quick.actions.verbs.cron', 'cron')
      ],
      isAvailable: () => ({ available: true }),
      run: async (ctx) => {
        ctx.openAutomations()
        return { status: 'ok' }
      }
    },
    {
      id: 'show-automations-in-sidebar',
      kind: 'action',
      title: translate(
        'auto.components.cmd.j.quick.actions.showAutomationsInSidebar',
        'Show Automations in Sidebar'
      ),
      description: translate(
        'auto.components.cmd.j.quick.actions.showAutomationsInSidebarDescription',
        'Pin an Automations entry to the sidebar navigation.'
      ),
      icon: Eye,
      verbKeywords: [
        translate('auto.components.cmd.j.quick.actions.verbs.showAutomations', 'show automations'),
        translate('auto.components.cmd.j.quick.actions.verbs.pinAutomations', 'pin automations')
      ],
      isAvailable: (ctx: CmdJQuickActionContext) => whenTrue(!ctx.automationsButtonVisible),
      run: async (ctx) => {
        ctx.setAutomationsButtonVisible(true)
        return { status: 'ok' }
      }
    },
    {
      id: 'hide-automations-in-sidebar',
      kind: 'action',
      title: translate(
        'auto.components.cmd.j.quick.actions.hideAutomationsInSidebar',
        'Hide Automations in Sidebar'
      ),
      description: translate(
        'auto.components.cmd.j.quick.actions.hideAutomationsInSidebarDescription',
        'Remove the Automations entry from the sidebar navigation.'
      ),
      icon: EyeOff,
      verbKeywords: [
        translate('auto.components.cmd.j.quick.actions.verbs.hideAutomations', 'hide automations')
      ],
      isAvailable: (ctx: CmdJQuickActionContext) => whenTrue(ctx.automationsButtonVisible),
      run: async (ctx) => {
        ctx.setAutomationsButtonVisible(false)
        return { status: 'ok' }
      }
    }
  ]
}
