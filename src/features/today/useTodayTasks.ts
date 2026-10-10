import { useCallback, useEffect, useState } from 'react'
import {
  MissingTimeZoneError,
  readBrowserTimeZone,
} from '@/domain/tasks/browserTimeZone'
import { useCurrentBusiness } from '@/features/business/CurrentBusinessContext'
import {
  beginTodayTasksQuery,
  createTodayTasksQuerySnapshot,
  failTodayTasksQuery,
  selectTodayTasksQueryView,
  succeedTodayTasksQuery,
} from '@/features/today/todayTasksQueryState'
import { listTodayTasks } from '@/services/api/listTodayTasks'

export function useTodayTasks() {
  const { businessId } = useCurrentBusiness()
  const [snapshot, setSnapshot] = useState(createTodayTasksQuerySnapshot)
  const [reloadSeq, setReloadSeq] = useState(0)

  const refetch = useCallback(() => {
    setReloadSeq((current) => current + 1)
  }, [])

  useEffect(() => {
    if (businessId === null) {
      setSnapshot(createTodayTasksQuerySnapshot())
      return
    }

    const timeZone = readBrowserTimeZone()
    if (!timeZone) {
      setSnapshot(failTodayTasksQuery(businessId, new MissingTimeZoneError()))
      return
    }

    const controller = new AbortController()
    let cancelled = false
    setSnapshot(beginTodayTasksQuery())

    void listTodayTasks(businessId, timeZone, { signal: controller.signal })
      .then((result) => {
        if (cancelled) {
          return
        }

        setSnapshot(succeedTodayTasksQuery(businessId, result))
      })
      .catch((caught: unknown) => {
        if (cancelled) {
          return
        }

        if (caught instanceof Error && caught.name === 'AbortError') {
          return
        }

        setSnapshot(
          failTodayTasksQuery(
            businessId,
            caught instanceof Error ? caught : new Error('Failed to load today tasks.'),
          ),
        )
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [businessId, reloadSeq])

  return {
    ...selectTodayTasksQueryView(snapshot, businessId),
    refetch,
  }
}
