export type CreatedTaskDto = {
  id: string
  businessId: string
  companyId: string | null
  decisionId: string
  title: string
  description: string | null
  dueAt: string | null
  priority: string
  status: string
  assignedToId: string | null
  createdById: string
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type CreateTaskFromDecisionResult = {
  task: CreatedTaskDto
}
