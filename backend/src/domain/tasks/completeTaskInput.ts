export const TASK_COMPLETION_OUTCOMES = [
  'CONTACTED',
  'NO_RESPONSE',
  'FOLLOW_UP',
  'DECLINED',
  'OTHER',
] as const

export type TaskCompletionOutcomeInput = (typeof TASK_COMPLETION_OUTCOMES)[number]

export type CompleteTaskInput = {
  outcome: TaskCompletionOutcomeInput
  comment: string | null
}

export class InvalidOutcomeError extends Error {
  constructor() {
    super('Invalid outcome.')
    this.name = 'InvalidOutcomeError'
  }
}

export class InvalidCommentError extends Error {
  constructor() {
    super('Invalid comment.')
    this.name = 'InvalidCommentError'
  }
}

export class CommentRequiredError extends Error {
  constructor() {
    super('Comment is required.')
    this.name = 'CommentRequiredError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTaskCompletionOutcome(value: string): value is TaskCompletionOutcomeInput {
  return (TASK_COMPLETION_OUTCOMES as readonly string[]).includes(value)
}

export function parseCompleteTaskInput(body: unknown): CompleteTaskInput {
  if (!isRecord(body) || !('outcome' in body) || typeof body.outcome !== 'string') {
    throw new InvalidOutcomeError()
  }

  if (!isTaskCompletionOutcome(body.outcome)) {
    throw new InvalidOutcomeError()
  }

  if ('comment' in body && typeof body.comment !== 'string') {
    throw new InvalidCommentError()
  }

  const comment = 'comment' in body && typeof body.comment === 'string' ? body.comment.trim() : ''
  if (body.outcome === 'OTHER' && comment.length === 0) {
    throw new CommentRequiredError()
  }

  return {
    outcome: body.outcome,
    comment: comment.length === 0 ? null : comment,
  }
}
