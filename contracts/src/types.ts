export type AclOptionsToken = {
  token: string;
};

export type AclOptionsAllowAll = {
  allowAll: true;
};

export type AclOptionsAllowList = {
  allowList: true;
};

export type AclOptionsXchain = {
  xchain: {
    chainId: number;
    blockHash: string;
    address: string;
    slot: number;
  }
};

export type AclOptions =
{
  address: string;
  options: AclOptionsToken | AclOptionsAllowAll | AclOptionsAllowList | AclOptionsXchain;
};

export type Poll = {
  creator: string;
  name: string;
  description: string;
  choices: string[];
  options: {
    publishVotes: boolean;
    closeTimestamp: number;
  };
  acl: AclOptions;
};

export type StorageProof = {
  key: string,
  value: string,
  proof: string[],
};

export type GetProofResponse = {
  balance: string,
  codeHash: string,
  nonce: string,
  storageHash: string,
  accountProof: string[],
  storageProof: StorageProof[],
};

export type TokenInfo = {
  chainId: bigint;
  addr: string;
  name: string;
  symbol: string;
  decimals: bigint;
  totalSupply: bigint;
}