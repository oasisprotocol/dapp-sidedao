import type { PollManager, Poll } from '@oasisprotocol/blockvote-contracts'
export type {
  Poll,
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
  active: boolean
  topChoice: bigint
  params: PollManager.ProposalParamsStructOutput
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
