import { useCallback, useEffect, useState } from 'react'
import { Pinata } from '../utils/Pinata'

export const useIPFSData = (hash: string | undefined) => {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<Uint8Array | undefined>()
  const [error, setError] = useState<string | undefined>()

  const fetchData = useCallback(
    async (key: string | undefined, forceRefresh?: boolean) => {
      if (!key) return

      setIsLoading(true)
      setError(undefined)
      try {
        setData(await Pinata.fetchData(key, forceRefresh))
      } catch (error: any) {
        setData(undefined)
        setError('Failed to load poll details.')
      } finally {
        setIsLoading(false)
      }
    },
    [setIsLoading, setError, setData],
  )

  useEffect(() => {
    void fetchData(hash)
  }, [hash])

  const refetch = useCallback(() => {
    return fetchData(hash, true)
  }, [fetchData, hash])

  return {
    isLoading,
    error,
    data,
    refetch,
  }
}
