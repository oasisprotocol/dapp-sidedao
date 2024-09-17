import { useEffect, useState } from 'react'
import { Pinata } from '../utils/Pinata'

export const useIPFSData = (hash: string | undefined) => {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<Uint8Array | undefined>()
  const [error, setError] = useState<string | undefined>()

  const fetchData = async (key: string | undefined) => {
    if (!key) return

    setIsLoading(true)
    setError(undefined)
    try {
      setData(await Pinata.fetchData(key))
    } catch {
      setError('Failed to load poll details from IPFS')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchData(hash)
  }, [hash])

  return {
    isLoading,
    error,
    data,
  }
}
