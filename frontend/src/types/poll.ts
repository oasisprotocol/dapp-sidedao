import type { PollManager, AclOptions } from '@oasisprotocol/blockvote-contracts'
export type {
  AclOptions,
  PollManager,
  GaslessVoting,
  IPollACL,
  IPollManagerACL,
  TokenInfo,
  AclOptionsXchain,
} from '@oasisprotocol/blockvote-contracts'

export type Proposal = {
  id: string
  topChoice: bigint
  params: PollManager.ProposalParamsStructOutput
}

// NOTE: this is stored on-chain, so it's essential to keep the encoded size
//       as small as possible! Such as using Uint8Array instead of hex encoded
//       addresses.
export type StoredPoll = {
  c: Uint8Array // creator address
  n: string // name
  d: string // description
  o: string[] // choices / options
  a: AclOptions // ACL options
}

/**
 * This is the decoded version of StoredPoll. More verbose and intuitive to use.
 */
export type Poll = {
  creator: string
  name: string
  description: string
  choices: string[]
  acl: AclOptions
}

export type ExtendedPoll = {
  id: string
  proposal: Proposal
  ipfsParams: Poll
  empty?: boolean
}

export type RemainingTime = {
  isPastDue: boolean
  totalSeconds: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

export type ListOfVoters = {
  out_count: bigint
  out_voters: string[]
}

export type ListOfVotes = ListOfVoters & {
  out_choices: PollManager.ChoiceStructOutput[]
}

export type ListOfChoices = Record<
  string,
  {
    choice: string
    votes: bigint
    rate: number
    winner: boolean
  }
>

export type PollResults = {
  totalVotes: bigint
  choices: ListOfChoices
  winner: string
  voters?: ListOfVoters
  votes?: ListOfVotes | undefined
}
