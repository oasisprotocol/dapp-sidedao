/// Ethers JS is retarded, their EIP-1193 provider doesn't actually implement EIP-1193
// import { Eip1193Provider } from "ethers";

export interface DemoEIP1193ProviderMessage {
  readonly type: string
  readonly data: unknown
}

export interface DemoEIP1193ProviderInfo {
  chainId: string
}

export interface DemoEIP1193ProviderRpcError extends Error {
  readonly code: number
  readonly data?: unknown
}

interface DemoMetaMask1193Extensions {
  isUnlocked(): Promise<boolean>
}

export interface DemoEIP1193Provider {
  // See: https://eips.ethereum.org/EIPS/eip-1474
  request(request: { method: 'eth_chainId' }): Promise<`0x${string}`>
  request(request: { method: 'eth_coinbase' }): Promise<`0x${string}`>
  request(request: { method: 'eth_gasPrice' }): Promise<`0x${string}`>
  request(request: { method: 'eth_blockNumber' }): Promise<`0x${string}`>
  request(request: { method: 'eth_accounts' }): Promise<`0x${string}`[]>
  request(request: { method: 'eth_requestAccounts' }): Promise<`0x${string}`[]>
  request(request: { method: string; params?: Array<any> | Record<string, any> }): Promise<any>

  on(event: 'connect', listener: (info: DemoEIP1193ProviderInfo) => void): DemoEIP1193Provider
  on(event: 'disconnect', listener: (error: DemoEIP1193ProviderRpcError) => void): DemoEIP1193Provider
  on(event: 'message', listener: (message: DemoEIP1193ProviderMessage) => void): DemoEIP1193Provider
  on(event: 'chainChanged', listener: (chainId: string) => void): DemoEIP1193Provider
  on(event: 'accountsChanged', listener: (accounts: string[]) => void): DemoEIP1193Provider

  removeListener(event: 'connect', listener: (info: DemoEIP1193ProviderInfo) => void): void
  removeListener(event: 'disconnect', listener: (error: DemoEIP1193ProviderRpcError) => void): void
  removeListener(event: 'message', listener: (message: DemoEIP1193ProviderMessage) => void): void
  removeListener(event: 'chainChanged', listener: (chainId: string) => void): void
  removeListener(event: 'accountsChanged', listener: (accounts: string[]) => void): void

  isMetaMask?: boolean

  _metamask?: DemoMetaMask1193Extensions
}
