import type { PollManager, Poll } from '@oasisprotocol/side-dao-contracts'
export type {
  Poll, AclOptions, PollManager, GaslessVoting,
  IPollACL, IPollManagerACL,
  TokenInfo,
  AclOptionsXchain
} from '@oasisprotocol/side-dao-contracts'

export type FullProposal = PollManager.ProposalWithIdStructOutput & { params: Poll } & { empty: Boolean };

export type LoadedPoll = PollManager.ProposalWithIdStructOutput & { ipfsParams: Poll; };

export type RemainingTime = {
  isPastDue: boolean
  totalSeconds: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

export type ListOfVotes = {
  out_count: bigint;
  out_voters: string[];
  out_choices: PollManager.ChoiceStructOutput[];
};

export type PollResults = {
  totalVotes: bigint,
  choices: Record<string, {
    choice: string,
    votes: bigint,
    rate: number,
    winner: boolean
  }>
  winner: string,
  votes?: ListOfVotes | undefined
}
