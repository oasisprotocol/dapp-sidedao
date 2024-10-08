import type { PollManager, AclOptions } from '@oasisprotocol/blockvote-contracts'
export type {
  AclOptions,
  PollManager,
  GaslessVoting,
  IPollACL,
  IPollManagerACL,
  TokenInfo,
  AclOptionsXchain,
  Poll as StoredPoll,
} from '@oasisprotocol/blockvote-contracts'

export type Proposal = {
  id: string
  owner: string
  topChoice: bigint
  params: PollManager.ProposalParamsStructOutput
}

/**
 * This is the decoded version of StoredPoll. More verbose and intuitive to use.
 */
export type Poll = {
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
