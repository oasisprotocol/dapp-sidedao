import type { IconT, ChainDefinition } from '@oasisprotocol/blockvote-contracts'
import { VITE_NETWORK_NUMBER } from '../constants/config'

export const getChainIconUrl = (icon: IconT | undefined): string =>
  icon === undefined ? undefined : typeof icon === 'string' ? icon : (icon as any).url

interface AddEthereumChainParameter {
  chainId: string
  chainName: string
  iconUrls?: string[]
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  rpcUrls: string[]
  blockExplorerUrls: string[] | null
}

export const getAddEthereumChainParameterFromDefinition = (
  def: ChainDefinition,
): AddEthereumChainParameter => ({
  chainId: `0x${def.chainId.toString(16)}`,
  chainName: def.name,
  iconUrls: def.icon ? [getChainIconUrl(def.icon)] : [],
  nativeCurrency: def.nativeCurrency,
  rpcUrls: def.rpcUrls,
  blockExplorerUrls: (def.explorers || []).map(e => e.url),
})

export const ConfiguredNetwork = VITE_NETWORK_NUMBER

export const getChainIdAsNumber = (chainId: number | string): number =>
  typeof chainId === 'string' ? parseInt(chainId, 16) : chainId

export enum ConnectionStatus {
  Unknown,
  Disconnected,
  Connected,
}

export const abbrAddr = (address: string): string => {
  if (!address) return ''
  const addr = address.replace('0x', '')
  return `${addr.slice(0, 5)}…${addr.slice(-5)}`
}
