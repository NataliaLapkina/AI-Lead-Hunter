export type VerifyKnowledgeResult = {
  knowledge: {
    id: string
    verificationStatus: string
    lastCheckedAt: string | null
    updatedAt: string
  }
}
