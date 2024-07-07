import type { PollManager } from '@oasisprotocol/dapp-voting-backend/src/contracts'
// import type { PollManager } from '@oasisprotocol/side-dao-contracts'

/**
 * Return type of PROPOSALS
 */
export type Poll = [boolean, bigint, PollManager.ProposalParamsStructOutput] & {
  active: boolean
  topChoice: bigint
  params: PollManager.ProposalParamsStructOutput
}
