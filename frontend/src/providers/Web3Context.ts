import { createContext } from 'react'
import { BrowserProvider } from 'ethers'

export interface Web3ProviderState {
  isConnected: boolean
  ethProvider: BrowserProvider | null
  sapphireEthProvider: BrowserProvider | null
  account: string | null
  explorerBaseUrl: string | null
  chainName: string | null
  isUnknownNetwork: boolean
}

export interface Web3ProviderContext {
  readonly state: Web3ProviderState
  connectWallet: () => Promise<void>
  switchNetwork: (chainId?: bigint) => Promise<void>
  isProviderAvailable: () => Promise<boolean>
}

export const Web3Context = createContext<Web3ProviderContext>({} as Web3ProviderContext)
