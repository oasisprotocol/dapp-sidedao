import { FC, PropsWithChildren } from 'react'
import { BrowserProvider, type Eip1193Provider, toBeHex } from 'ethers'
import { wrapEthersProvider } from '@oasisprotocol/sapphire-ethers-v6'
import { EIP1193Error } from '../utils/errors'
import detectEthereumProvider from '@metamask/detect-provider'
import { EIP1193Context, EIP1193ProviderContext } from './EIP1193Context'
import { VITE_NETWORK_BIGINT } from '../constants/config'
import { chain_info } from '@oasisprotocol/blockvote-contracts'
import { getAddEthereumChainParameterFromDefinition } from '../utils/crypto.demo'

declare global {
  interface Window {
    ethereum?: BrowserProvider & Eip1193Provider
  }
}

export const EIP1193ContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const isEIP1193ProviderAvailable = async () => {
    const provider = await detectEthereumProvider({
      // Explicitly set, provider doesn't have to be MetaMask
      mustBeMetaMask: false,
    })

    return !!provider
  }

  const connectWallet = async (gentle?: boolean): Promise<string | undefined> => {
    const accounts: string[] = gentle
      ? await (window.ethereum?.request?.({ method: 'eth_accounts' }) || Promise.resolve([]))
      : await (window.ethereum?.request?.({ method: 'eth_requestAccounts' }) || Promise.resolve([]))

    if (!accounts || accounts?.length <= 0) {
      if (gentle) return
      throw new Error('[EIP1193Context] Request account failed!')
    }

    return accounts[0]
  }

  const _addNetwork = (chainId: bigint = VITE_NETWORK_BIGINT) => {
    const chain = chain_info[Number(chainId)]
    if (!chain) {
      throw new Error(`Chain configuration for chain id '${chainId}' not found!`)
    }

    return window.ethereum?.request?.({
      method: 'wallet_addEthereumChain',
      params: [getAddEthereumChainParameterFromDefinition(chain)],
    })
  }

  const switchNetwork = async (toChainId: bigint = VITE_NETWORK_BIGINT) => {
    const ethProvider = new BrowserProvider(window.ethereum!)
    const sapphireEthProvider = wrapEthersProvider(ethProvider)

    const network = await sapphireEthProvider.getNetwork()

    if (network.chainId === BigInt(toChainId)) return

    try {
      const chainId = toBeHex(toChainId).replace('0x0', '0x')

      await window.ethereum!.request?.({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      })
    } catch (e) {
      const error = e as EIP1193Error
      // EIP1193 desktop - Throws e.code 4902 when chain is not available
      // Metamask mobile(edge case) - Throws generic -32603 (https://github.com/MetaMask/metamask-mobile/issues/3312)

      if (error?.code !== 4902 && error?.code !== -32603) {
        throw error
      } else {
        _addNetwork(toChainId)
      }
    }
  }

  const providerState: EIP1193ProviderContext = {
    isEIP1193ProviderAvailable,
    connectWallet,
    switchNetwork,
  }

  return <EIP1193Context.Provider value={providerState}>{children}</EIP1193Context.Provider>
}
