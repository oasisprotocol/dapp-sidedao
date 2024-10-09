import { AEAD, NonceSize, KeySize, TagSize } from '@oasisprotocol/deoxysii'
import type { IconT, ChainDefinition } from '@oasisprotocol/blockvote-contracts'
import { sha256 } from '@noble/hashes/sha256'
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
