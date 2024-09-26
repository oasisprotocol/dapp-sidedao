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

export type ListOfVotes = {
  out_count: bigint
  out_voters: string[]
  out_choices: PollManager.ChoiceStructOutput[]
}

export type PollResults = {
  totalVotes: bigint
  choices: Record<
    string,
    {
      choice: string
      votes: bigint
      rate: number
      winner: boolean
    }
  >
  winner: string
  votes?: ListOfVotes | undefined
}
