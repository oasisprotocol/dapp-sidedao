import { defineACL } from './common'
import {
  addMockValidation,
  Choice,
  DecisionWithReason,
  denyWithReason,
  useLabel,
  useOneOfField,
  useTextField,
} from '../InputFields'
import {
  abiEncode,
  chainsForXchain,
  checkXchainTokenHolder,
  ContractType,
  getChainDefinition,
  getContractDetails,
  getLatestBlock,
  isToken,
  isValidAddress,
} from '../../utils/poll.utils'
import { renderAddress } from '../Addresses'
import {
  AclOptionsXchain,
  fetchAccountProof,
  fetchStorageProof,
  fetchStorageValue,
  getBlockHeaderRLP,
  xchainRPC,
} from '@oasisprotocol/blockvote-contracts'
import { VITE_CONTRACT_ACL_STORAGEPROOF } from '../../constants/config'
import classes from './index.module.css'
import { BytesLike, getUint } from 'ethers'
import { useMemo } from 'react'

export const xchain = defineACL({
  value: 'acl_xchain',
  label: 'Cross-Chain DAO',
  costEstimation: 0.2,
  description: 'You can set a condition that is evaluated on another chain.',
  useConfiguration: active => {
    const chainChoices: Choice<number>[] = useMemo(
      () =>
        chainsForXchain.map(([id, name]) => ({
          value: id,
          label: `${name} (${id})`,
        })),
      [],
    )

    const chain = useOneOfField({
      name: 'chainId',
      label: 'Chain',
      visible: active,
      choices: chainChoices,
      onValueChange: (_, isStillFresh) => {
        if (contractAddress.isValidated) {
          void contractAddress.validate({ forceChange: true, reason: 'change', isStillFresh })
        }
      },
    })

    const contractAddress = useTextField({
      name: 'contractAddress',
      label: 'Contract Address',
      visible: active,
      placeholder: 'Contract address on chain. (Token or NFT)',
      required: [true, 'Please specify the address on the other chain that is the key to this poll!'],
      validators: [
        value => (isValidAddress(value) ? undefined : "This doesn't seem to be a valid address."),
        async (value, controls) => {
          controls.updateStatus({ message: 'Checking out contract...' })
          const details = await getContractDetails(chain.value, value)
          if (details) {
            contractType.setValue(details.type)
            contractName.setValue(details.name ?? details.addr) // TODO maybe shorten this
            symbol.setValue(details.symbol ?? '(none)')
          } else {
            contractType.setValue('Unknown')
            return 'Failed to load token details!'
          }
        },
      ],
      validateOnChange: true,
      showValidationSuccess: true,
      onValueChange: (_, isStillFresh) => {
        if (walletAddress.isValidated) {
          void walletAddress.validate({ forceChange: true, reason: 'change', isStillFresh })
        }
      },
    })

    const hasValidTokenAddress =
      contractAddress.visible && contractAddress.isValidated && !contractAddress.hasProblems

    const contractType = useLabel<ContractType | 'Unknown'>({
      name: 'contractType',
      visible: hasValidTokenAddress,
      label: 'Type:',
      compact: true,
      initialValue: 'Unknown',
      validators: value => {
        switch (value) {
          case 'ERC-20':
            return
          case 'ERC-721':
            return
          // return { message: 'Some ERC-721 tokens are not supported', level: 'warning' }
          case 'ERC-1155':
            return 'Unfortunately, ERC-1155 NFTs are Not supported at the moment. Please use another token of NFT.'
          case 'Unknown':
          default:
            return "We can't recognize this as a supported contract. Please use another token or NFT."
        }
      },
      validateOnChange: true,
      showValidationSuccess: true,
    })

    const contractName = useLabel({
      name: 'contractName',
      visible: hasValidTokenAddress && contractType.value !== 'Unknown',
      label: `${isToken(contractType.value as any) ? 'Token' : 'NFT'}:`,
      initialValue: '',
      compact: true,
      ...addMockValidation,
    })

    const symbol = useLabel({
      name: 'symbol',
      visible: hasValidTokenAddress && contractType.value !== 'Unknown',
      label: 'Symbol:',
      compact: true,
      initialValue: '',
      ...addMockValidation,
    })

    const walletAddress = useTextField({
      name: 'walletAddress',
      label: 'Wallet Address',
      visible: hasValidTokenAddress && !contractType.hasProblems,
      placeholder: 'Wallet address of a token holder on chain',
      required: [true, 'Please specify the address of a token holder!'],
      validators: [
        value => (isValidAddress(value) ? undefined : "This doesn't seem to be a valid address."),
        async (value, controls) => {
          if (contractType.value === 'Unknown') {
            return "Can't check balance for contracts of unknown type!"
          }

          const slot = await checkXchainTokenHolder(
            chain.value,
            contractAddress.value,
            contractType.value,
            value,
            controls.isStillFresh,
            progress => {
              controls.updateStatus({ message: progress })
            },
          )
          if (!slot) {
            if (contractType.value === 'ERC-721') {
              return "Can't find this NFT in this wallet. Please note the not all ERC-721 NFTs are supported. This one might not be. If this is important, please open an issue."
            } else {
              return "Can't confirm this token at this wallet."
            }
          }
          walletBalance.setValue(`Confirmed ${slot.balanceDecimal} ${symbol.value}`)
          slotNumber.setValue(slot.index.toString())
        },
        async (_value, controls) => {
          controls.updateStatus({ message: 'Looking up reference block ...' })
          const block = await getLatestBlock(chain.value)
          if (!block?.hash) return 'Failed to fetch latest block.'
          blockHash.setValue(block.hash)
          blockHeight.setValue(block.number.toString())
        },
      ],
      validateOnChange: true,
      showValidationSuccess: true,
    })

    const hasValidWallet = hasValidTokenAddress && walletAddress.isValidated && !walletAddress.hasProblems

    const walletBalance = useLabel({
      name: 'walletBalance',
      label: 'Balance:',
      visible: hasValidWallet,
      initialValue: '',
      classnames: classes.explanation,
      ...addMockValidation,
    })

    const slotNumber = useLabel({
      name: 'slotNumber',
      label: 'Stored at:',
      visible: hasValidWallet,
      initialValue: '',
      classnames: classes.explanation,
      formatter: slot => `Slot #${slot}`,
      ...addMockValidation,
    })

    const blockHash = useLabel({
      name: 'blockHash',
      label: 'Reference Block Hash',
      visible: hasValidWallet,
      initialValue: 'unknown',
      classnames: classes.explanation,
      renderer: renderAddress,
      ...addMockValidation,
    })

    const blockHeight = useLabel({
      name: 'blockHeight',
      label: 'Block Height',
      visible: hasValidWallet,
      initialValue: 'unknown',
      classnames: classes.explanation,
      ...addMockValidation,
    })

    return {
      fields: [
        chain,
        contractAddress,
        contractType,
        [contractName, symbol],
        walletAddress,
        [walletBalance, slotNumber],
        [blockHash, blockHeight],
      ],
      values: {
        chainId: chain.value,
        contractAddress: contractAddress.value,
        slotNumber: slotNumber.value,
        blockHash: blockHash.value,
      },
    }
  },
  getAclOptions: async ({ chainId, contractAddress, slotNumber, blockHash }, updateStatus) => {
    const showStatus = updateStatus ?? ((message?: string | undefined) => console.log(message))
    const rpc = xchainRPC(chainId)
    showStatus('Getting block header RLP')
    const headerRlpBytes = await getBlockHeaderRLP(rpc, blockHash)
    // console.log('headerRlpBytes', headerRlpBytes);
    showStatus('Fetching account proof')
    const rlpAccountProof = await fetchAccountProof(rpc, blockHash, contractAddress)
    // console.log('rlpAccountProof', rlpAccountProof);

    const options: AclOptionsXchain = {
      xchain: {
        chainId,
        blockHash,
        address: contractAddress,
        slot: parseInt(slotNumber),
      },
    }

    return [
      abiEncode(
        ['tuple(tuple(bytes32,address,uint256),bytes,bytes)'],
        [[[blockHash, contractAddress, slotNumber], headerRlpBytes, rlpAccountProof]],
      ),
      {
        address: VITE_CONTRACT_ACL_STORAGEPROOF,
        options,
      },
    ]
  },

  isThisMine: options => 'xchain' in options.options,

  checkPermission: async (pollACL, daoAddress, proposalId, userAddress, options) => {
    const xChainOptions = options.options
    let explanation = ''
    let error = ''
    let proof: BytesLike = ''
    let tokenInfo
    let canVote: DecisionWithReason = true
    const {
      xchain: { chainId, blockHash, address: tokenAddress, slot },
    } = xChainOptions
    const provider = xchainRPC(chainId)
    const chainDefinition = getChainDefinition(chainId)
    try {
      tokenInfo = await getContractDetails(chainId, tokenAddress)
      if (!tokenInfo) throw new Error("Can't load token details")
      explanation = `This poll is only for those who have hold ${tokenInfo?.name} token on ${chainDefinition.name} when the poll was created.`
      let isBalancePositive = false
      const holderBalance = getUint(
        await fetchStorageValue(provider, blockHash, tokenAddress, slot, userAddress),
      )
      if (holderBalance > BigInt(0)) {
        // Only attempt to get a proof if the balance is non-zero
        proof = await fetchStorageProof(provider, blockHash, tokenAddress, slot, userAddress)
        const result = await pollACL.canVoteOnPoll(daoAddress, proposalId, userAddress, proof)
        if (0n !== result) {
          isBalancePositive = true
          canVote = true
        }
      }
      if (!isBalancePositive) {
        canVote = denyWithReason(`you don't hold any ${tokenInfo.name} tokens on ${chainDefinition.name}`)
      }
    } catch (e) {
      const problem = e as any
      error = problem.error?.message ?? problem.reason ?? problem.code ?? problem
      console.error('Error when testing permission to vote on', proposalId, ':', error)
      console.error('proof:', proof)
      canVote = denyWithReason(`there was a technical problem verifying your permissions`)
    }
    return { canVote, explanation, error, proof, tokenInfo, xChainOptions }
  },
} as const)
