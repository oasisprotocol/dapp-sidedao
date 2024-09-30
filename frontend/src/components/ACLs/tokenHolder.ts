import { defineACL } from './common'
import {
  DecisionWithReason,
  deny,
  denyWithReason,
  useLabel,
  useOneOfField,
  useTextField,
} from '../InputFields'
import { abiEncode, getSapphireTokenDetails, isValidAddress } from '../../utils/poll.utils'
import { designDecisions, VITE_CONTRACT_ACL_TOKENHOLDER } from '../../constants/config'

export const tokenHolder = defineACL({
  value: 'acl_tokenHolder',
  costEstimation: 0.2,
  label: 'Holds Token on Sapphire',
  hidden: true, // We decided to hide this option, since this is not the focus
  useConfiguration: active => {
    const tokenAddress = useTextField({
      name: 'tokenAddress',
      label: 'Token Address',
      visible: active,
      required: [true, 'Please specify the address of the token that is the key to this poll!'],
      validators: [
        value => (!isValidAddress(value) ? "This doesn't seem to be a valid address." : undefined),
        async (value, controls) => {
          controls.updateStatus({ message: 'Fetching token details...' })
          const details = await getSapphireTokenDetails(value)
          if (!details) {
            return "Can't find token details!"
          }
          tokenName.setValue(details.name)
          tokenSymbol.setValue(details.symbol)
        },
      ],
      validateOnChange: true,
      showValidationSuccess: true,
    })

    const hasValidSapphireTokenAddress =
      tokenAddress.visible && tokenAddress.isValidated && !tokenAddress.hasProblems

    const tokenName = useLabel({
      name: 'tokenName',
      visible: hasValidSapphireTokenAddress,
      label: 'Selected token:',
      initialValue: '',
    })

    const tokenSymbol = useLabel({
      name: 'tokenSymbol',
      visible: hasValidSapphireTokenAddress,
      label: 'Symbol:',
      initialValue: '',
    })

    const voteWeighting = useOneOfField({
      name: 'voteWeighting',
      label: 'Vote weight',
      visible: active,
      choices: [
        {
          value: 'weight_perWallet',
          label: '1 vote per wallet',
          enabled: deny('Coming soon'),
        },
        {
          value: 'weight_perToken',
          label: 'According to token distribution',
        },
      ],
      disableIfOnlyOneVisibleChoice: designDecisions.disableSelectsWithOnlyOneVisibleOption,
    } as const)

    return {
      fields: [tokenAddress, [tokenName, tokenSymbol], voteWeighting],
      values: {
        tokenAddress: tokenAddress.value,
      },
    }
  },

  getAclOptions: props => {
    if (!props.tokenAddress) throw new Error('Internal errors: parameter mismatch, addresses missing.')
    return [
      abiEncode(['address'], [props.tokenAddress]),
      {
        address: VITE_CONTRACT_ACL_TOKENHOLDER,
        options: { token: props.tokenAddress },
      },
    ]
  },

  isThisMine: options => 'token' in options.options,

  checkPermission: async (pollACL, daoAddress, proposalId, userAddress, options) => {
    const tokenAddress = options.options.token
    const tokenInfo = await getSapphireTokenDetails(tokenAddress)
    const explanation = `You need to hold some ${tokenInfo?.name ?? 'specific'} token (on the Sapphire network) to vote.`
    const proof = new Uint8Array()
    let canVote: DecisionWithReason
    try {
      const result = 0n !== (await pollACL.canVoteOnPoll(daoAddress, proposalId, userAddress, proof))
      // console.log("tokenHolderAcl check:", result)
      if (result) {
        canVote = true
      } else {
        canVote = denyWithReason(`you don't hold any ${tokenInfo?.name} tokens`)
      }
    } catch {
      canVote = denyWithReason(`you don't hold any ${tokenInfo?.name} tokens`)
    }
    return { canVote, explanation, proof }
  },
} as const)
