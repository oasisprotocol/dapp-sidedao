// @ts-ignore
import { LRUCache } from 'lru-cache';

export abstract class Pinata {
  static JWT_TOKEN = import.meta.env.VITE_PINATA_JWT;
  static GATEWAY_URL = import.meta.env.VITE_IPFS_GATEWAY;

  static #cache = new LRUCache<string, Uint8Array>({ ttl: 60 * 60 * 5, max: 100 });

  static async pinData(data: Uint8Array) {
    const form = new FormData();
    form.append('file', new Blob([data], { type: 'application/octet-stream' }), 'file.bin');

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${Pinata.JWT_TOKEN}`,
      },
      body: form,
    });
    const resBody = await res.json();
    if (res.status !== 200) {
      console.log(res, resBody);
      throw new Error('pinData: failed to pin');
    }
    Pinata.#cache.set(resBody.IpfsHash, data);
    return resBody.IpfsHash as string;
  }

  static async fetchData(ipfsHash: string) {
    if (Pinata.#cache.has(ipfsHash)) {
      return Pinata.#cache.get(ipfsHash)!;
    }
    const gw = Pinata.GATEWAY_URL ?? 'https://w3s.link/ipfs';
    const url = `${gw}/${ipfsHash}`;
    const resp = await fetch(url);
    const data = new Uint8Array(await resp.arrayBuffer());
    Pinata.#cache.set(ipfsHash, data);
    return data;
  }
}