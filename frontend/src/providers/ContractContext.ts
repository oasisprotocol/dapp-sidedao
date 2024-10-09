import { EthereumContext } from './EthereumContext'
import { PollManager, IPollACL, GaslessVoting, IPollManagerACL } from '@oasisprotocol/blockvote-contracts'
import { createContext } from 'react'

export interface ContractContextData {
  readonly eth: EthereumContext
  readonly pollManager: PollManager | undefined
  readonly pollManagerAddress: string | undefined
  readonly pollManagerWithSigner: PollManager | undefined
  getPollACL: (address: string | undefined) => IPollACL | undefined
  readonly pollManagerACL: IPollManagerACL | undefined
  readonly gaslessVoting: GaslessVoting | undefined
}

export const ContractContext = createContext<ContractContextData>({} as ContractContextData)
