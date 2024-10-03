import { defineACL } from './common'
import { designDecisions, VITE_CONTRACT_ACL_ALLOWALL } from '../../constants/config'
import { denyWithReason, useOneOfField } from '../InputFields'

export const allowAll = defineACL({
  value: 'acl_allowAll',
  address: VITE_CONTRACT_ACL_ALLOWALL,
  label: 'Everybody',
  costEstimation: 0.1,
  useConfiguration: active => {
    const voteWeighting = useOneOfField({
      name: 'voteWeighting',
      label: 'Vote weight',
      visible: active,
      choices: [
        {
          value: 'weight_perWallet',
          label: '1 vote per wallet',
        },
      ],
      disableIfOnlyOneVisibleChoice: designDecisions.disableSelectsWithOnlyOneVisibleOption,
    } as const)

    return {
      fields: [voteWeighting],
      values: undefined,
    }
  },

  getAclOptions: () => ({
    data: '0x', // Empty bytes is passed
    options: { allowAll: true },
    flags: 0n,
  }),
  isThisMine: options => 'allowAll' in options,

  checkPermission: async (pollACL, daoAddress, proposalId, userAddress) => {
    const proof = new Uint8Array()
    const result = 0n !== (await pollACL.canVoteOnPoll(daoAddress, proposalId, userAddress, proof))
    const canVote = result ? true : denyWithReason('some unknown reason')
    return { canVote, proof }
  },
} as const)
