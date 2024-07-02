// prettier-ignore
/// <reference types="vite/client" />

interface ImportMetaEnv {
  // from vite.config.mts
  readonly VITE_PACKAGE_VERSION: string;
  readonly VITE_PACKAGE_NAME: string;
  readonly VITE_GIT_COMMIT_DATE: string;
  readonly VITE_GIT_COMMIT_HASH: string;
  readonly VITE_GIT_COMMIT_SHORT_HASH: string;

  // From .env.<env> {
  // Must have 'pinJSONToIPFS' permission
  readonly VITE_PINATA_JWT: string;

  // e.g. https://morp-zorp-derp-123.mypinata.cloud/ipfs
  readonly VITE_IPFS_GATEWAY: string | undefined;

  readonly VITE_NETWORK: string;
  readonly VITE_WEB3_GATEWAY: string;

  readonly VITE_CONTRACT_XCHAIN_HEADERCACHE: string;
  readonly VITE_CONTRACT_XCHAIN_ACCOUNTCACHE: string;
  readonly VITE_CONTRACT_XCHAIN_STORAGEPROOF: string;

  // Addresses of ACL contracts
  readonly VITE_CONTRACT_ACL_ALLOWALL: string;
  readonly VITE_CONTRACT_ACL_VOTERALLOWLIST: string;
  readonly VITE_CONTRACT_ACL_TOKENHOLDER: string;
  readonly VITE_CONTRACT_ACL_STORAGEPROOF: string;

  // Addresses of main contracts
  readonly VITE_CONTRACT_GASLESSVOTING: string;
  readonly VITE_CONTRACT_POLLMANAGER: string;

  // Address of IPollManagerACL used by PollManager contract
  readonly VITE_CONTRACT_POLLMANAGER_ACL: string;
  // }
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
