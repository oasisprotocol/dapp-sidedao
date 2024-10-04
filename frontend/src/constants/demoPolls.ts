import { randomchoice } from '@oasisprotocol/blockvote-contracts'
import { ExtendedPoll, FLAG_ACTIVE } from '../types'

export const demoPoll1 = {
  id: 'demo',
  proposal: {
    id: '0xdemo',
    owner: 'demo',
    params: {
      flags: FLAG_ACTIVE,
    },
  },
  ipfsParams: {
    name: 'What is your favorite form of investment?',
    description: '',
    choices: ['US dollar', 'Physical gold', 'Crypto'],
  },
} as ExtendedPoll

export const demoPoll2 = {
  id: 'demo',
  proposal: {
    id: '0xdemo',
    owner: 'demo',
    params: {
      flags: FLAG_ACTIVE,
    },
  },
  ipfsParams: {
    name: 'What is your greatest fear?',
    description: '',
    choices: ['Climate change', 'Deadly pandemics', 'AI apocalypse', 'Dystopia and dictatorship'],
  },
} as ExtendedPoll

export const demoPoll3 = {
  id: 'demo',
  proposal: {
    id: '0xdemo',
    owner: 'demo',
    params: {
      flags: FLAG_ACTIVE,
    },
  },
  ipfsParams: {
    name: 'What is your favorite movie?',
    description: '',
    choices: ['Terminator', 'The Matrix', 'Tron', 'The Godfather'],
  },
} as ExtendedPoll

export const demoPoll4 = {
  id: 'demo',
  proposal: {
    id: '0xdemo',
    owner: 'demo',
    params: {
      flags: FLAG_ACTIVE,
    },
  },
  ipfsParams: {
    name: 'How should the change the laws?',
    description: '',
    choices: ['Ban strong cryptography', 'Ban blockchains', "Withdraw the FED's monopoly on money printing"],
  },
} as ExtendedPoll

export const getDemoPoll = (): ExtendedPoll => randomchoice([demoPoll1, demoPoll2, demoPoll3, demoPoll4])
