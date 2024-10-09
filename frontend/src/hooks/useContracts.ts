import { useContext } from 'react'
import { ContractContext } from '../providers/ContractContext'

export const useContracts = () => {
  const value = useContext(ContractContext)
  if (Object.keys(value).length === 0) {
    throw new Error('[useContracts] Component not wrapped within a Provider')
  }

  return value
}
