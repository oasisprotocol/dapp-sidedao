import { AEAD, NonceSize, KeySize, TagSize } from '@oasisprotocol/deoxysii'
import { sha256 } from '@noble/hashes/sha256'
import { VITE_NETWORK_NUMBER } from '../constants/config'

/// XXX: Seriously JavaScript... can't compare Uint8Arrays???
function areBytewiseEqual(a: Uint8Array, b: Uint8Array) {
  return indexedDB.cmp(a, b) === 0
}

export function encrypt(plaintext: string) {
  const plainbytes = new TextEncoder().encode(plaintext)
  const key = window.crypto.getRandomValues(new Uint8Array(KeySize))
  const nonce = sha256.create().update(key).update(plainbytes).digest().slice(0, NonceSize)
  const cipherbytes = new Uint8Array([...nonce, ...new AEAD(new Uint8Array(key)).encrypt(nonce, plainbytes)])
  return { key, cipherbytes }
}

export function decrypt(key: Uint8Array, cipherbytes: Uint8Array) {
  if (cipherbytes.length <= NonceSize + TagSize) {
    throw new Error('decrypt: invalid cipherbytes length')
  }
  if (key.length != KeySize) {
    throw new Error('decrypt: invalid key length')
  }
  const nonce = cipherbytes.slice(0, NonceSize)
  const plainbytes = new AEAD(new Uint8Array(key)).decrypt(nonce, cipherbytes.slice(NonceSize))
  const keyedDigest = sha256.create().update(key).update(plainbytes).digest()
  if (!areBytewiseEqual(keyedDigest.slice(0, NonceSize), nonce)) {
    throw new Error('decrypt: invalid nonce')
  }
  return new TextDecoder().decode(plainbytes)
}

export function encryptJSON(plain: any) {
  return encrypt(JSON.stringify(plain))
}

export function decryptJSON(key: Uint8Array, cipherbytes: Uint8Array) {
  const plaintext = decrypt(key, cipherbytes)
  return JSON.parse(plaintext)
}

export enum DemoNetwork {
  Unknown = 0,
  Ethereum = 1,
  Goerli = 10,
  BscMainnet = 56,
  BscTestnet = 97,
  EmeraldTestnet = 0xa515,
  EmeraldMainnet = 0xa516,
  SapphireTestnet = 0x5aff,
  SapphireMainnet = 0x5afe,
  SapphireLocalnet = 0x5afd,
  PolygonMumbai = 0x13381,
  Local = 1337,

  FromConfig = VITE_NETWORK_NUMBER,
}

const demoNetworkNameMap: Record<DemoNetwork, string> = {
  [DemoNetwork.Unknown]: 'Unknown Network',
  [DemoNetwork.Ethereum]: 'Ethereum',
  [DemoNetwork.Local]: 'Local Network',
  [DemoNetwork.Goerli]: 'Goerli',
  [DemoNetwork.EmeraldTestnet]: 'Emerald Testnet',
  [DemoNetwork.EmeraldMainnet]: 'Emerald Mainnet',
  [DemoNetwork.SapphireTestnet]: 'Sapphire Testnet',
  [DemoNetwork.SapphireMainnet]: 'Sapphire Mainnet',
  [DemoNetwork.SapphireLocalnet]: 'Sapphire Localnet',
  [DemoNetwork.PolygonMumbai]: 'Polygon Mumbai',
  [DemoNetwork.BscMainnet]: 'BSC',
  [DemoNetwork.BscTestnet]: 'BSC Testnet',
} as const

export function demoNetworkFromChainId(chainId: number | string): DemoNetwork {
  const id = typeof chainId === 'string' ? parseInt(chainId, 16) : chainId
  if (DemoNetwork[id]) return id as DemoNetwork
  return DemoNetwork.Unknown
}

export function demoNetworkName(network?: DemoNetwork): string {
  if (network && demoNetworkNameMap[network]) {
    return demoNetworkNameMap[network]
  }
  return demoNetworkNameMap[DemoNetwork.Unknown]
}

export enum DemoConnectionStatus {
  Unknown,
  Disconnected,
  Connected,
}

export const abbrAddr = (address: string): string => {
  if (!address) return ''
  const addr = address.replace('0x', '')
  return `${addr.slice(0, 5)}…${addr.slice(-5)}`
}
