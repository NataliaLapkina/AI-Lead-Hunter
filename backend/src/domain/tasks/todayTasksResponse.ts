export type TodayTaskCompanyDto = {
  id: string
  name: string
}

export type TodayTaskDecisionDto = {
  id: string
  title: string
  status: string
}

export type TodayTaskDto = {
  id: string
  title: string
  status: string
  dueAt: string
  priority: string
  isOverdue: boolean
  company: TodayTaskCompanyDto | null
  decision: TodayTaskDecisionDto | null
}

export type TodayTasksResponse = {
  tasks: TodayTaskDto[]
}
