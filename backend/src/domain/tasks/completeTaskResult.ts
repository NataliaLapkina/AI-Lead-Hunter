export type CompleteTaskResult = {
  task: {
    id: string
    status: string
    completedAt: string
    completionOutcome: string
    completionComment: string | null
  }
}
