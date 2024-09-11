import { useEffect, useState } from 'react';
import { Pinata } from '../utils/Pinata'

const cache = new Map<string, any>()

export const useIPFSData = (hash: string | undefined) => {

  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<Uint8Array | undefined>()
  const [error, setError] = useState<string | undefined>()

  const fetchData = async (key: string) => {
    console.log("Fetching", key, "from Pinata")
    setIsLoading(true)
    setError(undefined)
    try {
      const data = await Pinata.fetchData(key)
      cache.set(key, data)
      console.log("Storing new value. Cache now has", cache.size, "elements.")
      setData(data)
    } catch {
      setError("Failed to fetch data from IPFS")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(
    () => {
      if (!hash) return
      const storedValue = cache.get(hash)
      if (storedValue) {
        console.log("Cache hit on", hash)
        setData(storedValue)
      } else {
        void fetchData(hash)
      }
    },
    [hash]
  )

  return {
    isLoading,
    error,
    data,
  }
}