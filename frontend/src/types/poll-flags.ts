import { PollManager } from './poll'

export const FLAG_ACTIVE = 1n << 0n
export const FLAG_PUBLISH_VOTERS = 1n << 1n
export const FLAG_PUBLISH_VOTES = 1n << 2n
export const FLAG_HIDDEN = 1n << 3n
export const FLAG_WEIGHT_LOG10 = 1n << 4n
export const FLAG_WEIGHT_ONE = 1n << 5n

type Params = PollManager.ProposalParamsStructOutput

export const isPollActive = (params: Params | undefined): boolean => !!((params?.flags ?? 0n) & FLAG_ACTIVE)

export const inactivatePoll = (params: Params): Params => ({
  ...params,
  flags: isPollActive(params) ? params.flags ^ FLAG_ACTIVE : params.flags,
})

export const shouldPublishVotes = (params: Params | undefined): boolean =>
  !!((params?.flags ?? 0n) & FLAG_PUBLISH_VOTES)

export const shouldPublishVoters = (params: Params | undefined): boolean =>
  !!((params?.flags ?? 0n) & FLAG_PUBLISH_VOTERS)
