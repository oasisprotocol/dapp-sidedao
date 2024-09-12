import { useEffect, useState } from 'react'
import { Pinata } from '../utils/Pinata'

export const useIPFSData = (hash: string | undefined) => {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<Uint8Array | undefined>()
  const [error, setError] = useState<string | undefined>()

  const fetchData = async (key: string) => {
    setIsLoading(true)
    setError(undefined)
    try {
      setData(await Pinata.fetchData(key))
    } catch {
      setError('Failed to fetch data from IPFS')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!hash) return
    void fetchData(hash)
  }, [hash])

  return {
    isLoading,
    error,
    data,
  }
}
