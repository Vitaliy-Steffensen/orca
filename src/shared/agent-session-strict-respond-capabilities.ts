// Split out of protocol-version.ts, which lists them in RUNTIME_CAPABILITIES.

// Why: agentSession.respondToQuestion has a strict schema, so clients must not send structured
// `answers` to an older host; they fall back to the answer packed into `optionId`.
export const AGENT_SESSION_QUESTION_ANSWERS_RUNTIME_CAPABILITY =
  'agent-session.question-answers.v1' as const
// Why: agentSession.respondToApproval is strict too, and an approval has no packed fallback — its
// optionId is matched against the prompt's own options — so a client must not send a decision note
// to an older host; it hides the field rather than drop what the user typed.
export const AGENT_SESSION_APPROVAL_NOTE_RUNTIME_CAPABILITY =
  'agent-session.approval-note.v1' as const

export const AGENT_SESSION_STRICT_RESPOND_RUNTIME_CAPABILITIES = [
  AGENT_SESSION_QUESTION_ANSWERS_RUNTIME_CAPABILITY,
  AGENT_SESSION_APPROVAL_NOTE_RUNTIME_CAPABILITY
] as const
