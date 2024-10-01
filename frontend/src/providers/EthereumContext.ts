import { JsonRpcProvider, JsonRpcSigner } from 'ethers'
import { createContext } from 'react'
import { DemoConnectionStatus } from '../utils/crypto.demo'

export interface EthereumState {
  signer: JsonRpcSigner | undefined
  provider: JsonRpcProvider
  network: number
  address: string | undefined
  status: DemoConnectionStatus
  isSapphire: boolean
}

export interface EthereumContext {
  readonly state: EthereumState
  readonly isHomeChain: boolean
  readonly userAddress: string
  connect: () => Promise<void>
  addNetwork: (network: number | undefined) => Promise<void>
  switchNetwork: (network?: number | undefined) => Promise<void>
}

export const EthereumContext = createContext<EthereumContext>({} as EthereumContext)
