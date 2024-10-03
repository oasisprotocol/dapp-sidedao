// EIP-3085: wallet_addEthereumChain RPC Method
import { ExtendedPoll } from '../types'
import { randomchoice, chain_info } from '@oasisprotocol/blockvote-contracts'

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

const configuredChain = chain_info[VITE_NETWORK_NUMBER]
const configuredExplorer = (configuredChain.explorers ?? [])[0]
export const configuredExplorerUrl = configuredExplorer?.url
export const configuredNetworkName = configuredChain.name
export const nativeTokenName = configuredChain.nativeCurrency.name
export const nativeTokenSymbol = configuredChain.nativeCurrency.symbol

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

export const MIN_COMPLETION_TIME_MINUTES = 3

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

export const demoPoll3 = {
  id: 'demo',
  proposal: {
    id: '0xdemo',
    active: true,
  },
  ipfsParams: {
    creator: 'demo',
    name: 'What is your favorite movie?',
    description: '',
    choices: ['Terminator', 'The Matrix', 'Tron', 'The Godfather'],
    options: {
      publishVotes: false,
    },
  },
} as ExtendedPoll

export const demoPoll4 = {
  id: 'demo',
  proposal: {
    id: '0xdemo',
    active: true,
  },
  ipfsParams: {
    creator: 'demo',
    name: 'How should the change the laws?',
    description: '',
    choices: ['Ban strong cryptography', 'Ban blockchains', "Withdraw the FED's monopoly on money printing"],
    options: {
      publishVotes: false,
    },
  },
} as ExtendedPoll

export const getDemoPoll = (): ExtendedPoll => randomchoice([demoPoll1, demoPoll2, demoPoll3, demoPoll4])

export const demoSettings = {
  timeForVoting: 610,
  waitSecondsBeforeFormallyCompleting: 5,
  jumpToSecondsBeforeCompletion: 5,
  timeContractionSeconds: 5,
}

type DashboardFeature = 'gaslessStatus' | 'permissions' | 'results'

/**
 * This is where wou can configure which extra features do you want for the dashboard
 */
const enabledDashboardFeatures: DashboardFeature[] = [
  'gaslessStatus', // Do we want to show the gasless status on each card?
  // 'permissions', // Do we want to show the permissions on each card?
  // 'results', // Do we want to show the results on each card?
]

export const dashboard = {
  showGasless: enabledDashboardFeatures.includes('gaslessStatus'),
  showPermissions: enabledDashboardFeatures.includes('permissions'),
  showResults: enabledDashboardFeatures.includes('results'),
}

/**
 * Aesthetic decisions about the UI
 */
export const designDecisions = {
  hideGaslessIndicator: true,
  hideOpenPollIndicator: true,
  hideRestrictedPollHaveAccessIndicator: true,
  hideMyPollIndicator: true,
  showInaccessiblePollCheckbox: true,
  hideDisabledSelectOptions: true,
  disableSelectsWithOnlyOneVisibleOption: true,
  showSubmitButton: false,
  hidePollCardsWithErrors: true,
}

export const appName = 'Oasis Blockvote'
export const appNameAndTagline = 'Oasis Blockvote, a poll creation tool for your DAO'
export const appDescription =
  'Create polls for everyone or just your group, with public results but cryptographically secure and private votes.'
export const appRootUrl = 'http://vote.oasis.io'

export const allowedAnimations = [
  'dashboardNoPolls', // No poll indicator appearing on the dashboard
  'dashboardPollCards', // Poll cards appearing and disappearing on search etc
  // 'conditionalField', // A field is conditionally hidden or shown
  'fieldStatus', // Field validation pending, error, correct status indication
  'fieldValidationErrors', // Field validation errors
  'permissionWarning', // We have found out that you don't have permission to vote
  'countdown', // A countdown has moving digits
  'voting', // Submitting a vote
  'voteSubmitted', // We have submitted out vote
  'resultsDisplay', // Animated display of poll results
]
