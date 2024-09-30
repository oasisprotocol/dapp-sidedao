import { defineACL } from './common'
import { VITE_CONTRACT_ACL_ALLOWALL } from '../../constants/config'
import { denyWithReason } from '../InputFields'

export const allowAll = defineACL({
  value: 'acl_allowAll',
  label: 'Everybody',
  costEstimation: 0.1,
  useConfiguration: () => ({
    fields: [],
    values: undefined,
  }),
  getAclOptions: () => [
    '0x', // Empty bytes is passed
    {
      address: VITE_CONTRACT_ACL_ALLOWALL,
      options: { allowAll: true },
    },
  ],
  isThisMine: options => 'allowAll' in options.options,

  checkPermission: async (pollACL, daoAddress, proposalId, userAddress) => {
    const proof = new Uint8Array()
    const result = 0n !== (await pollACL.canVoteOnPoll(daoAddress, proposalId, userAddress, proof))
    const canVote = result ? true : denyWithReason('some unknown reason')
    return { canVote, proof }
  },
} as const)
