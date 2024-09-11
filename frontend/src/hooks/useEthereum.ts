import { useContext } from 'react'
import { EthereumContext } from '../providers/EthereumContext'

export const useEthereum = () => {
  const value = useContext(EthereumContext)
  if (Object.keys(value).length === 0) {
    throw new Error('[useDemoEthereum] Component not wrapped within a Provider')
  }

  return value
}
