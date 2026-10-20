# Custom features

Everything this fork has that upstream [`stablyai/orca`](https://github.com/stablyai/orca) does not
— one line each, to skim. The detail lives in [`FORK.md`](./FORK.md), whose numbered sections are
referenced below, and in [`MIRROR.md`](./MIRROR.md) for what this repository itself owns.

Adding a feature here? See the rule at the top of [`CLAUDE.md`](./CLAUDE.md).

## Added in this repo

- ⌘U narrows the Changes list to files with unstaged edits, and pressing it again shows every change.
- Every file tree marks each file with how many notes, agent notes, unanswered review threads and unsent review comments it carries.
- Pull request sync is an automation: it runs on a schedule even when the window is hidden, and each check shows up in the run history.
- A Monday weekly recap template writes what landed on the default branch into the run's workspace and its history.
- A Wednesday template posts a Linear project status update for the projects you lead.
- Window > New Companion Window opens a second Orca window for another screen, paired to this app with its own active workspace and tabs.
- A new tab is a new chat: Claude and Cursor are not chosen up front, and the model menu lists both.
- Run on a workspace card starts that project's dev commands together, shows booting then running, and can open the app and sign in.
- Run brings OrbStack up first when the stack needs containers, puts every service in one split terminal, and the card says whether it is spinning up or running and ready.
- Pick Ask / Supervised / Autonomous when creating a workspace, each with its own agent, model, and prompt.
- Calmer chrome: the right sidebar splits into an actions row over a view-tabs row, workspace cards keep colour for agent questions and failures only, and main plus Automations are hidden until you add them back from ⌘J.
- ⇧⌘W closes every other tab and keeps the one you are in.
- ⇧⌘H reveals the file you are looking at in whichever list is in front of you — the Source Control
  changes, the Explorer tree, or the combined diff's own file tree — and flashes the row.
- Your `~/.orca/themes/` VS Code theme also colours notebook cells, code excerpts, combined-diff
  sections and the automation prompt editor, not just the editor and diff viewer.
- The editor highlights 37 languages with the same TextMate grammars VS Code uses, so a
  `~/.orca/themes/` theme paints control flow, functions and types as it does there.
- The app releases and auto-updates from this repository instead of upstream's or Frederik's.
- A relative language server Path is read from the worktree root, and one that never starts keeps
  saying so instead of going quiet after its first warning.
- Workspaces also follow their agent: a blocked, questioning, failed, idle or working agent moves
  the card to the column you mapped it to, and a card you moved by hand stays put.
- Workspace cards come in one style, and carry chips that appear only when something is wrong —
  failing checks, a conflict with the base, or a branch left behind it.
- A workspace card shows the pull request author's face when that pull request was opened by someone else.
- Right-clicking a workspace card lists its linked pull request and issues under "Open in", so the
  GitHub or Linear page is one menu away.
- Workspace cards you were asked to review show how long ago the review was asked for, and say when
  it is a re-request with its own fresh clock.
- A workspace card shows the pull request diff (`+`/`−`), a frontend/backend/e2e/CI pie, Linear
  priority, GitHub stack position, unresolved review comments, and `Nd` once the pull request has
  been open longer than 3 days.
- An agent can stage inline review comments and the review summary with `orca review comment add`
  and `orca review summary set`, marked as its drafts in the pending-review shelf, for you to accept
  and submit as your own review.
- A review comment an agent stages is a proposal with an Accept and a Reject on it; only what you
  accept is submitted, and the rest stay waiting.
- A Re-review button beside Review re-checks a pull request against the comments you already left.
- Shift+Tab in the chat composer turns Claude's Plan mode on and off, the composer names the mode
  you are in, and the next chat starts in the one you left off in.
- A plan waiting on you reads in the transcript instead of a cramped card, and the composer carries
  the decision: Copy, Approve (⌘⇧↵), and a field where what you type is sent back as the changes to
  make.
- Mark a workspace Autonomous or Supervised from its card menu or `orca worktree set --autonomy`;
  autonomous ones carry a quiet marker on the card, and the setting never leaves Orca.
- Right-click a workspace to Archive it: everything it is running shuts down and it leaves the
  sidebar, keeping the checkout. Cmd+J's "View Archived Workspaces" brings them back to unarchive,
  and a merged or closed pull request can archive its workspace instead of deleting it.
- Source Control shows Changes, Staged Changes and Unstaged Changes together. Tick a file off on
  the Changes list; it unticks itself and shows a dot when that file actually changes.
- Group workspace status lanes into collapsible sidebar sections, each header counting what it holds.
- Give a sidebar status section its own icon and color, and count the workspaces in each nested lane.
- Sidebar clutter moves into two "More" menus: activity, workspace options and Add project in the header, reveal active workspace, the board, settings and help at the bottom.

## Inherited from `frbarbre/orca`

Taken whole with every mirror; the fork lineage's work on top of upstream.

1. The updater reads its release channel from an env var, so a fork can retarget it. (§1)
2. Step through a branch's changed files from the keyboard, and open a review comment at its line. (§2)
3. Workspaces follow their pull request: board column per PR state, auto-delete on merge or close,
   and a review workspace opened when you are asked to review. (§3)
4. Review mode: queue inline comments on your own device, then send them as one review with an
   approve / request-changes / comment verdict. (§4)
5. Theme the editor and diff viewer from any VS Code theme file in `~/.orca/themes/`. (§5)
6. Move focus between tab groups by direction with ⌥⌘+arrow. (§6)
7. Show the linked Linear issue's title on a workspace card. (§7)
8. A review workspace is re-pointed at the PR's current head after a push, plus other PR automations. (§8)
9. Hide agents' temporary `/tmp` checkouts from the sidebar, and run a tab group's Run command from
   a shortcut. (§9)
10. Queue an inline pull-request comment for an agent from the diff, not just the PR panel. (§10)
11. `@`-mention repository members in every pull-request comment box. (§11)
12. Sending comments to an agent leaves the threads open instead of auto-resolving them. (§12)
13. A top-bar button for the workspace's one next step (commit, push, create PR, resolve conflicts),
    and a Review button when the branch has a pull request. (§13)
14. Pick where the review diff starts: since your last review, from any commit, or the whole PR. (§14)
15. Paste or drop images and videos into any review comment box. (§15)
16. Export your settings to a file and import them on another machine. (§16)
17. Filter changed files by type — tests, docs, generated, assets — from `.gitattributes` rules. (§17)
18. View a Claude Code pane as its claude.ai Remote Control page, beside Terminal and Chat UI. (§18)
19. Send a diff note to an agent in three key presses. (§19)
20. A diff opened from the file list centres on its first change instead of pinning it to the top. (§20)
21. Agents leave notes on diff lines with `orca notes add`, shown as note cards with the agent's icon. (§21)
22. A review thread GitHub marked outdated stays in the diff, placed after the last line. (§22)
23. An open branch diff follows along when you pick a new diff base. (§23)
24. Type `:` in a comment box for an emoji shortcode picker. (§24)
25. A button that opens the newest preview deployment for the pull request. (§25)
26. Language servers: a registry of languages and servers you pick per language in settings. (§26)
27. Git Blame for the cursor's line, with the author, the commit and its pull request on hover. (§27)
28. Material Icon Theme file and folder icons everywhere files are listed. (§28)
29. The right sidebar follows the active file's kind — source control for a diff, files for a file. (§29)
30. Quick Open ranks by filename first, searches file contents with `%`, and goes to a line with `:`. (§30)
31. Every agent turn gets its own diff, independent of what was committed or staged. (§31)
32. Source-control sections are resizable and share one header, heading and count. (§32)
33. A shortcut for the latest agent turn, and horizontal trackpad scrolling in combined diffs. (§33)
34. Cmd+click a reference inside a Peek preview to open the real file. (§34)
35. One **Changes** section listing every file that differs from the branch base, committed or not. (§35)
36. Source-control sections reorder by drag and hide from their menu; Review is one section. (§36)
37. The PR panel gets the same draggable, hideable sections. (§37)
38. ⌥⌘U narrows the Changes list to uncommitted work. (§38)
39. A status-bar "N queued" count, and ⌥⌘S to send queued comments from anywhere. (§39)
40. Resolved pull-request comments get their own PR panel section. (§40)
41. The new-comment box opens a gap in the diff instead of covering the code under it. (§41)
42. Hovering a reaction says who reacted. (§42)
43. Your unsent review comments get their own Source Control section. (§43)
44. ↑/↓ scroll the combined diff, and the next-file step snaps to the next file's header in it. (§44)
45. Tab drags work over the Claude web view. (§45)
46. Opening an agent turn or a commit filters the Changes list instead of opening a combined view. (§46)
47. ⌥⌘+arrow moves between tab groups from inside the Claude web view. (§47)
48. The Claude web view reloads itself when it misses a prompt Orca delivered through the terminal. (§48)
49. Agent notes render as markdown. (§49)
50. A review workspace opens as the agent beside the pull request's first changed file. (§50)
51. No Create PR button in the Source Control header — PRs are opened by the agent or the CLI. (§51)
52. Source Control is one scroll of stacked sections at their natural height. (§52)
53. A follow-up on a note goes straight to an agent. (§53)
54. ⇧⌥⌘R focuses the review summary box. (§54)
55. The Changes header totals the added and removed lines of the files it lists. (§55)
56. A review summary shows the verdict it was submitted with. (§56)
57. `orca file open --line/--column` opens a file with the cursor on that spot. (§57)
58. Workspace setup scripts run silently in the background while a chat opens; a Setup tab and toast appear only if the script fails.
59. The sidebar header and bottom bar tuck their secondary actions (activity, workspace options, add project, reveal workspace, board, help) under "…" menus.
60. Tasks and Automations moved out of the sidebar nav into the bottom "…" menu.
61. The workspace header action buttons always show their label next to the icon, at any panel width.
62. The sidebar header "…" menu toggles the main workspace out of the list and back in one click.
63. Board settings groups statuses under their sections, so you can rename, add to, and move statuses between sections in place. (§63)
64. Select code in any editor or diff and click Ask on the floating toolbar to get a short answer in a new chat.
65. The right sidebar shows a coloured state label: merge conflicts, CI failed, changes requested, waiting for CI, awaiting review, draft PR, local only, ready to merge.
