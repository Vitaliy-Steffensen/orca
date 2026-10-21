# Frontend rulebook

Reached from Phase D when the diff touches the frontend and the repository ships no frontend
review rulebook of its own. One agent per heading below. Each is single-purpose on purpose: the
point of the fan-out is that no single context carries the whole rulebook _and_ reads the diff
carefully.

Give every agent: the base and head refs, the frontend files from the Phase B groups with their
ratings, and the text of its own heading — pasted in, not referenced. A sub-agent cannot resolve
the Orca CLI or this guide on its own.

Every agent returns one `findings-json` block in the schema the main guide defines, and nothing
else that matters. Set `verified: true` only for a finding you re-derived from the source after
first assuming it was wrong.

## Sizing the fan-out

Always spawn the four **core** agents. Add the **extended** agents when the frontend diff is
substantial — more than roughly ten changed frontend files, a new screen or route, or a change
to shared state or a shared component. Spawn a **conditional** agent only when its trigger is in
the diff.

A fixed thirteen-agent fan-out is right for one known codebase and wrong for a skill that runs on
every Review button press in any repository.

## Core — FE-A1 Correctness and logic bugs

The ordinary bugs, in the changed lines and in what they reach: inverted or wrong conditions,
off-by-one and boundary cases, `null`/`undefined` reaching a property access, empty-array and
empty-string paths, numbers parsed from strings, dates and timezones, early returns that skip
cleanup, promises not awaited, errors swallowed, a `catch` that hides the failure it caught.
Follow the call sites — a correct function called wrongly is this agent's finding too.

## Core — FE-A2 Render lifecycle and component contract

Effects and their dependency lists: missing dependencies, a dependency that makes the effect run
every render, an effect that sets state it also depends on. Subscriptions, timers, listeners and
observers created without teardown. State derived in an effect that should have been computed
during render. Keys on list items that are indexes over a reorderable list. Conditional hooks,
or hooks behind an early return. Props the component mutates. A component that re-mounts because
its element is created inside another component's body.

## Core — FE-A3 Data fetching, cache and persisted state

Loading, empty and error states: which of the three the change forgot. Requests that race, and
a response applied after the component moved on or the input changed. Stale cache after a
mutation, and cache keys that do not carry everything the response depends on. Optimistic
updates with no rollback. Retries without backoff. Anything written to local, session or disk
storage: its shape change against what is already stored on a user's machine, and what happens
when the stored value is from an older version.

## Core — FE-A4 Written-conventions compliance

Read the repository's own rules — contributor docs, style guide, design-system docs, lint and
formatter configuration, the surrounding code — and check the diff against them. Cite each
finding with a `DOC:<path>#<slug>` standard id. This agent reports only rules it can show in
writing; its own taste is out of scope, and a rule the linter already enforces is the linter's
finding, not a review comment.

## Extended — FE-B1 State and data-flow boundaries

State placed where it does not belong: component state another component needs, global state
only one screen reads, a store slice reaching into another slice's internals, a component
writing state it does not own. Derived values stored instead of computed. Props drilled through
layers that only pass them on.

## Extended — FE-B2 Types and safety

Type assertions and casts that paper over a shape the code never checked, `any` and its
equivalents, non-null assertions on values that can be null, optional fields read as required,
unions narrowed by a check that does not actually narrow them, and types that disagree with the
data the API returns.

## Extended — FE-B3 Duplication and reuse

Logic the repository already has, rewritten: a new helper beside an existing one, a second
implementation of a component variant, a copied block that now has two places to fix. Name the
existing implementation by path — a duplication finding without the original is a guess.

## Extended — FE-B4 Architecture and import direction

Imports that run the wrong way for this repository's layering, a module that now knows about a
layer it should not, a shared module that grew a feature-specific dependency, a circular import,
and a file that has taken on a second responsibility.

## Extended — FE-B5 Naming and necessity

Names that say the role rather than the thing, names that contradict what the code does, and
code that does not need to exist: a wrapper that only forwards, an abstraction with one caller,
a flag never set false, dead branches the change left behind.

## Extended — FE-B6 Accessibility and untrusted rendering

Interactive elements that are not focusable or reachable by keyboard, controls with no
accessible name, focus lost or trapped after a route or modal change, contrast below the
project's own standard, and motion with no reduced-motion path. Also: any value from the network
or the user rendered as HTML, built into a URL, or passed to a navigation API.

## Conditional — FE-C1 Test conventions (test files changed)

Follow the repository's own test conventions. Tests asserting implementation detail rather than
behaviour, a selector that will break on an unrelated copy change, waits on a clock rather than
on a condition, shared mutable state between tests, and a test that passes whether or not the
change works.
