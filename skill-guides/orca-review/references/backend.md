# Backend rulebook

Reached from Phase D when the diff touches the backend and the repository ships no backend review
rulebook of its own. One agent per heading below, single-purpose for the same reason the frontend
rulebook is: no single context carries the whole rulebook _and_ reads the diff carefully.

Give every agent: the base and head refs, the backend files from the Phase B groups with their
ratings, and the text of its own heading — pasted in, not referenced.

Every agent returns one `findings-json` block in the schema the main guide defines. Set
`verified: true` only for a finding you re-derived from the source after first assuming it was
wrong.

## Sizing the fan-out

Always spawn the four **core** agents. Add the **extended** agents when the backend diff is
substantial — more than roughly ten changed backend files, a new endpoint or job, a schema
change, or a change to shared infrastructure. Spawn a **conditional** agent only when its
trigger is in the diff.

## Core — BE-A1 Correctness and logic bugs

Inverted or wrong conditions, boundary cases, null and missing-key paths, empty collections,
numeric and currency arithmetic, dates and timezones, early returns that skip cleanup,
unhandled rejections, errors swallowed by a bare `catch`, and a correct function called
wrongly at its call sites. Follow what the changed code reaches, not only the changed lines.

## Core — BE-A2 Authorization and input validation

Who may call this, and what they may call it with. A new endpoint, job, command or field with
no authorization check, or one that checks authentication and calls it authorization. Object-
level checks missing — the caller is allowed to use this route, but not for _this_ record. Input
taken into a query, a path, a command line, a template or a deserializer without validation.
Mass assignment: fields a client can set that it should not. Secrets, tokens or personal data in
logs, errors or responses. Rate limiting and abuse paths on anything newly exposed.

## Core — BE-A3 Data integrity, migrations and backfills

Writes that should be one transaction and are not. Partial failure leaving a half-written
record. Uniqueness and foreign keys enforced in code but not in the schema, or the reverse.
Migrations: whether the change is safe against the rows that already exist, whether it locks a
table that is in use, whether old code can still run against the new schema and new code against
the old — because both will, during a deploy. Backfills that read the whole table at once, and
backfills with no way to resume. Whether there is a way back.

## Core — BE-A4 Written-conventions compliance

Read the repository's own rules — contributor docs, architecture notes, lint configuration, the
surrounding code — and check the diff against them. Cite each finding with a `DOC:<path>#<slug>`
standard id. Rules the linter already enforces are the linter's finding, not a review comment.

## Extended — BE-B1 Layering and responsibility boundaries

Business logic in a request handler, persistence in a domain object, a module reaching past the
layer that owns a concern, a shared module that grew a caller-specific dependency, and a file
that has taken on a second responsibility.

## Extended — BE-B2 Error handling and return contracts

What a caller sees when this fails: an exception where the contract returns a result, a status
code that does not match what happened, an error message that leaks internals, a failure
reported as success, and a retry that cannot tell a transient failure from a permanent one.

## Extended — BE-B3 Query performance

A query inside a loop over rows the caller already has. A fetch of whole objects where a count
or an exists would do. A filter or sort on an unindexed column. Unbounded result sets and
missing pagination. A read that now runs on every request where it used to be cached.

## Extended — BE-B4 Concurrency, idempotency and resource lifetimes

Two callers running this at once: lost updates, check-then-act races, and locks taken in
different orders. Whether a retried or duplicated request does the work twice. Connections,
file handles, locks and transactions opened on a path that can return before closing them.
Background work started with no way to observe or stop it.

## Extended — BE-B5 Types, naming and craft

Types that disagree with the data they describe, casts over unvalidated shapes, names that say
the role rather than the thing, code with no caller, an abstraction with one caller, and dead
branches the change left behind.

## Conditional — BE-C1 Test sufficiency (behaviour changed)

Against the repository's own test conventions: whether a test exists that fails without this
change, whether the error paths are covered and not only the happy one, tests that assert
implementation rather than behaviour, shared mutable state between tests, and waits on a clock
rather than on a condition.
