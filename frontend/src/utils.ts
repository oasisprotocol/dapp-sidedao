import { AEAD, NonceSize, KeySize, TagSize } from '@oasisprotocol/deoxysii';
import { sha256 } from '@noble/hashes/sha256';
import { LRUCache } from 'lru-cache';
import { Ref, computed, ref, watch } from 'vue';

export function randomchoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

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

export function computedAsync<T>(getter: () => Promise<T>): Ref<T | undefined> {
  const result = ref<T>();
  const asyncValue = computed(getter);

  watch(asyncValue, async () => (result.value = await asyncValue.value), { immediate: true });

  return result;
}

/// XXX: Seriously JavaScript... can't compare Uint8Arrays???
function areBytewiseEqual(a: Uint8Array, b: Uint8Array) {
  return indexedDB.cmp(a, b) === 0;
}

export function decrypt(key: Uint8Array, cipherbytes: Uint8Array) {
  if (cipherbytes.length <= NonceSize + TagSize) {
    throw new Error('decrypt: invalid cipherbytes length');
  }
  if (key.length != KeySize) {
    throw new Error('decrypt: invalid key length');
  }
  const nonce = cipherbytes.slice(0, NonceSize);
  const plainbytes = new AEAD(new Uint8Array(key)).decrypt(nonce, cipherbytes.slice(NonceSize));
  const keyedDigest = sha256.create().update(key).update(plainbytes).digest();
  if (!areBytewiseEqual(keyedDigest.slice(0, NonceSize), nonce)) {
    throw new Error('decrypt: invalid nonce');
  }
  return new TextDecoder().decode(plainbytes);
}

export function decryptJSON(key: Uint8Array, cipherbytes: Uint8Array) {
  const plaintext = decrypt(key, cipherbytes);
  return JSON.parse(plaintext);
}

export function encrypt(plaintext: string) {
  const plainbytes = new TextEncoder().encode(plaintext);
  const key = window.crypto.getRandomValues(new Uint8Array(KeySize));
  const nonce = sha256.create().update(key).update(plainbytes).digest().slice(0, NonceSize);
  const cipherbytes = new Uint8Array([
    ...nonce,
    ...new AEAD(new Uint8Array(key)).encrypt(nonce, plainbytes),
  ]);
  return { key, cipherbytes };
}

export function encryptJSON(plain: any) {
  return encrypt(JSON.stringify(plain));
}

export const abbrAddr = (address: string): string => {
  if (!address) return '';
  const addr = address.replace('0x', '');
  return `${addr.slice(0, 5)}…${addr.slice(-5)}`;
};

function rejectDelay(reason: string) {
  return new Promise(function (resolve, reject) {
    setTimeout(reject.bind(null, reason), 5000);
  });
}

export async function retry<T extends Promise<any>>(
  attempt: T,
  tryCb: (value: Awaited<T>) => void = () => {},
  maxAttempts = 10,
): Promise<Awaited<T>> {
  let p: Promise<Awaited<typeof attempt>> = Promise.reject();

  for (let i = 0; i < maxAttempts; i++) {
    p = p
      .catch(() => attempt)
      .then((value) => {
        return tryCb(value);
      })
      .catch(rejectDelay) as Promise<Awaited<typeof attempt>>;
  }

  return p;
}
