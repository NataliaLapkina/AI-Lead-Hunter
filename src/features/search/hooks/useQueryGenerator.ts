import { useCallback, useState } from 'react'
import type { SearchQuery } from '@/domain/lead'
import { repositories } from '@/repositories'
import {
  queryGenerator,
  type QueryGeneratorInput,
} from '@/services/search/RuleBasedQueryGenerator'

export function useQueryGenerator() {
  const [queries, setQueries] = useState<SearchQuery[]>([])
  const [history, setHistory] = useState<SearchQuery[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const loadHistory = useCallback(async () => {
    const items = await repositories.searchQueries.getAll()
    setHistory(items)
  }, [])

  const generate = useCallback(async (input: QueryGeneratorInput) => {
    setIsGenerating(true)
    try {
      const generated = queryGenerator.generate(input)
      setQueries(generated)
      for (const q of generated) {
        await repositories.searchQueries.add(q)
      }
      await loadHistory()
      return generated
    } finally {
      setIsGenerating(false)
    }
  }, [loadHistory])

  return {
    queries,
    history,
    isGenerating,
    generate,
    loadHistory,
    clearQueries: () => setQueries([]),
  }
}
