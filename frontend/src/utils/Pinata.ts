import { StoredLRUCache } from './StoredLRUCache'
import { VITE_IPFS_GATEWAY, VITE_PINATA_JWT } from '../constants/config'

export abstract class Pinata {
  static JWT_TOKEN = VITE_PINATA_JWT
  static GATEWAY_URL = VITE_IPFS_GATEWAY

  static #cache = new StoredLRUCache<string, Uint8Array, void>({
    storageKey: 'sideDAO.ipfsCache',
    ttl: 1000 * 60 * 60 * 5,
    max: 1000,
    constantValues: true,
    // debug: ['fetch'],
    transformValues: {
      encode: data => JSON.stringify(data),
      decode: stringData => new Uint8Array(Object.values(JSON.parse(stringData))),
    },
    fetcher: async hash => {
      const gw = Pinata.GATEWAY_URL ?? 'https://w3s.link/ipfs'
      const url = `${gw}/${hash}`
      const resp = await fetch(url)
      const buffer = await resp.arrayBuffer()
      return new Uint8Array(buffer)
    },
  })

  static async pinData(data: Uint8Array) {
    const form = new FormData()
    form.append('file', new Blob([data], { type: 'application/octet-stream' }), 'file.bin')

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${Pinata.JWT_TOKEN}`,
      },
      body: form,
    })
    const resBody = await res.json()
    if (res.status !== 200) {
      console.log(res, resBody)
      throw new Error('pinData: failed to pin')
    }
    Pinata.#cache.set(resBody.IpfsHash, data)
    return resBody.IpfsHash as string
  }

  static fetchData = (ipfsHash: string) => Pinata.#cache.fetch(ipfsHash, {})
}
