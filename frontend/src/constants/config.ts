// EIP-3085: wallet_addEthereumChain RPC Method
import { ExtendedPoll } from '../types'
import { randomchoice } from '@oasisprotocol/side-dao-contracts'

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

export const CHAINS: Map<bigint, AddEthereumChainParameter> = new Map([
  [
    23294n,
    {
      chainId: '0x5afe',
      chainName: 'Oasis Sapphire',
      iconUrls: ['https://votee.oasis.io/rose.png'],
      nativeCurrency: {
        name: 'ROSE',
        symbol: 'ROSE',
        decimals: 18,
      },
      rpcUrls: ['https://sapphire.oasis.io/', 'wss://sapphire.oasis.io/ws'],
      blockExplorerUrls: ['https://explorer.oasis.io/mainnet/sapphire'],
    },
  ],
  [
    23295n,
    {
      chainId: '0x5aff',
      chainName: 'Oasis Sapphire Testnet',
      iconUrls: ['https://votee.oasis.io/rose.png'],
      nativeCurrency: { name: 'TEST', symbol: 'TEST', decimals: 18 },
      rpcUrls: ['https://testnet.sapphire.oasis.dev/', 'wss://testnet.sapphire.oasis.dev/ws'],
      blockExplorerUrls: ['https://explorer.oasis.io/testnet/sapphire'],
    },
  ],
  [
    23293n,
    {
      chainId: '0x5afd',
      chainName: 'Sapphire Localnet',
      iconUrls: ['https://votee.oasis.io/rose.png'],
      nativeCurrency: {
        name: 'ROSE',
        symbol: 'ROSE',
        decimals: 18,
      },
      rpcUrls: ['http://localhost:8545/', 'ws://localhost:8546'],
      blockExplorerUrls: null,
    },
  ],
])

export const NETWORK_NAMES: Record<string, string> = {
  'Oasis Sapphire': 'Sapphire',
  'Oasis Sapphire Testnet': 'Sapphire Testnet',
  'Sapphire Localnet': 'Sapphire Localnet',
}

export const METAMASK_HOME_PAGE_URL = 'https://metamask.io/'
// export const GITHUB_REPOSITORY_URL = 'https://github.com/oasisprotocol/dapp-votee/'

const {
  VITE_NETWORK: ENV_VITE_NETWORK,
  VITE_WEB3_GATEWAY,
  VITE_CONTRACT_ACL_ALLOWALL,
  VITE_CONTRACT_ACL_TOKENHOLDER,
  VITE_CONTRACT_ACL_VOTERALLOWLIST,
  VITE_CONTRACT_ACL_STORAGEPROOF,
  VITE_CONTRACT_POLLMANAGER,
  VITE_CONTRACT_POLLMANAGER_ACL,
  // VITE_REACT_APP_BUILD_VERSION,
  // VITE_REACT_APP_BUILD_DATETIME: ENV_VITE_REACT_APP_BUILD_DATETIME,
  VITE_PINATA_JWT,
  VITE_IPFS_GATEWAY,
  VITE_CONTRACT_GASLESSVOTING,
} = import.meta.env

const VITE_NETWORK_BIGINT: bigint = BigInt(ENV_VITE_NETWORK) ?? 0n
const VITE_NETWORK_NUMBER: number = Number(VITE_NETWORK_BIGINT)

// const VITE_REACT_APP_BUILD_DATETIME = Number(ENV_VITE_REACT_APP_BUILD_DATETIME) ?? 0

export {
  VITE_NETWORK_BIGINT,
  VITE_NETWORK_NUMBER,
  VITE_WEB3_GATEWAY,
  VITE_CONTRACT_ACL_ALLOWALL,
  VITE_CONTRACT_ACL_TOKENHOLDER,
  VITE_CONTRACT_ACL_VOTERALLOWLIST,
  VITE_CONTRACT_ACL_STORAGEPROOF,
  VITE_CONTRACT_POLLMANAGER,
  VITE_CONTRACT_POLLMANAGER_ACL,
  VITE_CONTRACT_GASLESSVOTING,
  // VITE_REACT_APP_BUILD_VERSION,
  // VITE_REACT_APP_BUILD_DATETIME,
  VITE_PINATA_JWT,
  VITE_IPFS_GATEWAY,
}

export const MIN_CLOSE_TIME_MINUTES = 3

export const demoPoll1 = {
  id: 'demo',
  proposal: {
    id: '0xdemo',
    active: true,
  },
  ipfsParams: {
    creator: 'demo',
    name: 'What is your favorite form of investment?',
    description: '',
    choices: ['US dollar', 'Physical gold', 'Crypto'],
    options: {
      publishVotes: false,
    },
  },
} as ExtendedPoll

export const demoPoll2 = {
  id: 'demo',
  proposal: {
    id: '0xdemo',
    active: true,
  },
  ipfsParams: {
    creator: 'demo',
    name: 'What is your greatest fear?',
    description: '',
    choices: ['Climate change', 'Deadly pandemics', 'AI apocalypse', 'Dystopia and dictatorship'],
    options: {
      publishVotes: false,
    },
  },
} as ExtendedPoll

export const getDemoPoll = (): ExtendedPoll => randomchoice([demoPoll1, demoPoll2])

export const demoSettings = {
  timeForVoting: 610,
  waitSecondsBeforeFormallyClosing: 5,
  jumpToSecondsBeforeClosing: 5,
  timeContractionSeconds: 5,
}

export const dashboardFiltering = {
  enabled: true,
  hideInaccessibleByDefault: true,
  showOnlyOpenByDefault: true,
}
