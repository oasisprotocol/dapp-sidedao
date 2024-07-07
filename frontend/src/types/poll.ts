import type { PollManager, Poll } from '@oasisprotocol/side-dao-contracts'
export type { Poll } from '@oasisprotocol/side-dao-contracts'

export type FullProposal = PollManager.ProposalWithIdStructOutput & { params: Poll } & { empty: Boolean };