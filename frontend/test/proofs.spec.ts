import { encode } from '@ethereumjs/rlp';
import { Trie } from '@ethereumjs/trie';
import { bytesToHex, hexToBytes } from '@ethereumjs/util';
import { BLOCK_HEADERS, STORAGE_PROOF_RESPONSE, decodeBlockHeaderRlp } from './common';
import { hexlify } from 'ethers';

describe('Proofs', function () {
  it('Decode Block Headers', async () => {
    for (const [k, v] of Object.entries(BLOCK_HEADERS)) {
      // Lets make sure all the hard-coded block headers can decode
      const header = decodeBlockHeaderRlp(v);
      expect(header.number).toBeGreaterThan(0);
      expect(hexlify(header.hash())).toEqual(k);
    }
  });

  it('STORAGE_PROOF_RESPONSE to verify', async () => {
    const storageProof = STORAGE_PROOF_RESPONSE.storageProof;
    const key = storageProof[0].key;
    const trie = new Trie({ useKeyHashing: true });

    await trie.fromProof(storageProof[0].proof.map((p) => hexToBytes(p)));

    const proof = await trie.createProof(hexToBytes(key));
    const value = await trie.verifyProof(
      hexToBytes(STORAGE_PROOF_RESPONSE.storageHash),
      hexToBytes(key),
      proof,
    );

    expect(value).not.toBeNull();
    expect(bytesToHex(encode(storageProof[0].value))).toEqual(bytesToHex(value!!));
  });
});
