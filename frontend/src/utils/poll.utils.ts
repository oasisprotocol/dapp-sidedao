import { AbiCoder, BytesLike, getAddress, getUint, JsonRpcProvider, ParamType } from 'ethers'

import {
  chain_info,
  erc20TokenDetailsFromProvider,
  xchainRPC,
  AclOptions,
  isERC20TokenContract,
  guessStorageSlot,
  getBlockHeaderRLP,
  fetchAccountProof,
  getNftContractType,
  ChainDefinition,
  AclOptionsToken,
  AclOptionsXchain,
  fetchStorageProof,
  IPollACL__factory,
  TokenInfo,
  fetchStorageValue,
} from '@oasisprotocol/side-dao-contracts'
import {
  VITE_CONTRACT_ACL_ALLOWALL,
  VITE_CONTRACT_ACL_STORAGEPROOF,
  VITE_CONTRACT_ACL_TOKENHOLDER,
  VITE_CONTRACT_ACL_VOTERALLOWLIST,
} from '../constants/config'
import { Poll, PollManager } from '../types'
import { encryptJSON } from './crypto.demo'
import { Pinata } from './Pinata'
import { EthereumContext } from '../providers/EthereumContext'
import { DecisionWithReason, denyWithReason } from '../components/InputFields'
import { FetcherFetchOptions } from './StoredLRUCache'

export { parseEther } from 'ethers'

export const chainsForXchain: [number, string][] = Object.keys(chain_info)
  .map(id => parseInt(id))
  .filter(chainId => !chain_info[chainId].cannotMakeStorageProofs)
  .map(chainId => [chainId, chain_info[chainId].name])

// Check if an address is valid
export const isValidAddress = (address: string) => {
  try {
    getAddress(address)
  } catch (e: any) {
    if (e.code == 'INVALID_ARGUMENT') {
      return false
    } else {
      console.log('Unknown problem:', e)
      return true
    }
  }
  return true
}

export const getSapphireTokenDetails = async (address: string) => {
  const chainId = 23294
  const rpc = xchainRPC(chainId)
  try {
    return await erc20TokenDetailsFromProvider(getAddress(address), rpc)
  } catch {
    return undefined
  }
}

/**
 *  Encode the %%values%% as the %%types%% into ABI data.
 *
 *  @returns DataHexstring
 */
const abiEncode = (types: ReadonlyArray<string | ParamType>, values: ReadonlyArray<any>): string => {
  const abi = AbiCoder.defaultAbiCoder()
  return abi.encode(types, values)
}

export const getAllowAllACLOptions = (): [string, AclOptions] => {
  return [
    '0x', // Empty bytes is passed
    {
      address: VITE_CONTRACT_ACL_ALLOWALL,
      options: { allowAll: true },
    },
  ]
}

export const getAllowListAclOptions = (addresses: string[]): [string, AclOptions] => {
  return [
    abiEncode(['address[]'], [addresses]),
    {
      address: VITE_CONTRACT_ACL_VOTERALLOWLIST,
      options: { allowList: true },
    },
  ]
}

export const getTokenHolderAclOptions = (tokenAddress: string): [string, AclOptions] => {
  return [
    abiEncode(['address'], [tokenAddress]),
    {
      address: VITE_CONTRACT_ACL_TOKENHOLDER,
      options: { token: tokenAddress },
    },
  ]
}

export const getXchainAclOptions = async (
  props: {
    chainId: number
    contractAddress: string
    slotNumber: number
    blockHash: string
  },
  updateStatus?: ((status: string | undefined) => void) | undefined,
): Promise<[string, AclOptions]> => {
  const { chainId, contractAddress, slotNumber, blockHash } = props
  const showStatus = updateStatus ?? ((message?: string | undefined) => console.log(message))
  const rpc = xchainRPC(chainId)
  showStatus('Getting block header RLP')
  const headerRlpBytes = await getBlockHeaderRLP(rpc, blockHash)
  // console.log('headerRlpBytes', headerRlpBytes);
  showStatus('Fetching account proof')
  const rlpAccountProof = await fetchAccountProof(rpc, blockHash, contractAddress)
  // console.log('rlpAccountProof', rlpAccountProof);
  return [
    abiEncode(
      ['tuple(tuple(bytes32,address,uint256),bytes,bytes)'],
      [[[blockHash, contractAddress, slotNumber], headerRlpBytes, rlpAccountProof]],
    ),
    {
      address: VITE_CONTRACT_ACL_STORAGEPROOF,
      options: {
        xchain: {
          chainId,
          blockHash,
          address: contractAddress,
          slot: slotNumber,
        },
      },
    },
  ]
}

export const isERC20Token = async (chainId: number, address: string) =>
  isERC20TokenContract(xchainRPC(chainId), address)

export const getERC20TokenDetails = async (chainId: number, address: string) => {
  const rpc = xchainRPC(chainId)
  return await erc20TokenDetailsFromProvider(getAddress(address), rpc)
}

export const getChainDefinition = (chainId: number): ChainDefinition => chain_info[chainId]

export const checkXchainTokenHolder = async (
  chainId: number,
  tokenAddress: string,
  holderAddress: string,
  progressCallback?: (progress: string) => void,
) => {
  const rpc = xchainRPC(chainId)
  try {
    return await guessStorageSlot(rpc, tokenAddress, holderAddress, 'latest', progressCallback)
  } catch (_) {
    return undefined
  }
}

export const getNftType = async (chainId: number, address: string): Promise<string | undefined> => {
  const rpc = xchainRPC(chainId)
  return getNftContractType(address, rpc)
}

export const getLatestBlock = async (chainId: number) => await xchainRPC(chainId).getBlock('latest')

export type CreatePollProps = {
  question: string
  description: string
  answers: string[]
  aclData: string
  aclOptions: AclOptions
  subsidizeAmount: bigint | undefined
  publishVotes: boolean
  completionTime: Date | undefined
}

export const createPoll = async (
  pollManager: PollManager,
  creator: string,
  props: CreatePollProps,
  updateStatus: (message: string) => void,
) => {
  const {
    question,
    description,
    answers,
    aclData,
    aclOptions,
    subsidizeAmount,
    publishVotes,
    completionTime,
  } = props

  updateStatus('Compiling data')
  const poll: Poll = {
    creator,
    name: question,
    description,
    choices: answers,
    options: {
      publishVotes,
      closeTimestamp: completionTime ? Math.round(completionTime.getTime() / 1000) : 0,
    },
    acl: aclOptions,
  }

  // console.log('Compiling poll', poll)

  const { key, cipherbytes } = encryptJSON(poll)

  updateStatus('Saving poll data to IPFS')
  const ipfsHash = await Pinata.pinData(cipherbytes)

  if (!ipfsHash) throw new Error('Failed to save to IPFS, try again!')
  // console.log('Poll ipfsHash', ipfsHash);
  // updateStatus("Saved to IPFS")

  const proposalParams: PollManager.ProposalParamsStruct = {
    ipfsHash,
    ipfsSecret: key,
    numChoices: answers.length,
    publishVotes: poll.options.publishVotes,
    closeTimestamp: poll.options.closeTimestamp,
    acl: aclOptions.address,
  }

  console.log('params are', proposalParams)
  console.log('ACL data is', aclData)

  updateStatus('Calling signer')
  const createProposalTx = await pollManager.create(proposalParams, aclData, {
    value: subsidizeAmount ?? 0n,
  })

  console.log('TX created.', createProposalTx)

  console.log('doCreatePoll: creating proposal tx', createProposalTx.hash)

  updateStatus('Sending transaction')

  const receipt = (await createProposalTx.wait())!
  if (receipt.status !== 1) {
    console.log('Receipt is', receipt)
    throw new Error('createProposal tx receipt reported failure.')
  }
  const proposalId = receipt.logs[0].data

  updateStatus('Created poll')

  // console.log('doCreatePoll: Proposal ID', proposalId);

  return proposalId
}

export const completePoll = async (eth: EthereumContext, pollManager: PollManager, proposalId: string) => {
  await eth.switchNetwork() // ensure we're on the correct network first!
  // console.log("Preparing complete tx...")

  const tx = await pollManager.close(proposalId)
  // console.log('Complete proposal tx', tx);

  const receipt = await tx.wait()

  if (receipt!.status != 1) throw new Error('Complete ballot tx failed')
}

export type PollPermissions = {
  proof: BytesLike
  explanation: string | undefined
  canVote: DecisionWithReason
  canManage: boolean
  tokenInfo: TokenInfo | undefined
  xChainOptions: AclOptionsXchain | undefined
  error: string
}

export type CheckPermissionInputs = Pick<AclOptions, 'options'> & {
  userAddress: string
  proposalId: string
  aclAddress: string
}

export type CheckPermissionContext = {
  daoAddress: string
  provider: JsonRpcProvider
}

export const checkPollPermission = async (
  input: CheckPermissionInputs,
  context: CheckPermissionContext,
  fetchOptions?: FetcherFetchOptions<PollPermissions, CheckPermissionContext>,
): Promise<PollPermissions | undefined> => {
  const { daoAddress, provider } = context
  const { userAddress, proposalId, aclAddress, options } = input

  const pollACL = IPollACL__factory.connect(aclAddress, provider)

  let proof: BytesLike = ''
  let explanation = ''
  let canVote: DecisionWithReason = true
  const canManage = await pollACL.canManagePoll(daoAddress, proposalId, userAddress)
  let error = ''
  let tokenInfo: TokenInfo | undefined = undefined
  let xChainOptions: AclOptionsXchain | undefined = undefined

  const isAllowAll = 'allowAll' in options
  const isTokenHolder = 'token' in options
  const isWhitelist = 'allowList' in options
  const isXChain = 'xchain' in options

  if (isAllowAll) {
    proof = new Uint8Array()
    const result = 0n !== (await pollACL.canVoteOnPoll(daoAddress, proposalId, userAddress, proof))
    if (result) {
      canVote = true
      explanation = ''
    } else {
      canVote = denyWithReason('some unknown reason')
    }
  } else if (isWhitelist) {
    proof = new Uint8Array()
    explanation = 'This poll is only for a predefined list of addresses.'
    const result = 0n !== (await pollACL.canVoteOnPoll(daoAddress, proposalId, userAddress, proof))
    // console.log("whiteListAcl check:", result)
    if (result) {
      canVote = true
    } else {
      canVote = denyWithReason('you are not on the list of allowed addresses')
    }
  } else if (isTokenHolder) {
    const tokenAddress = (options as AclOptionsToken).token
    tokenInfo = await getSapphireTokenDetails(tokenAddress)
    explanation = `You need to hold some ${tokenInfo?.name ?? 'specific'} token (on the Sapphire network) to vote.`
    proof = new Uint8Array()
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
  } else if (isXChain) {
    xChainOptions = options as AclOptionsXchain

    const {
      xchain: { chainId, blockHash, address: tokenAddress, slot },
    } = xChainOptions
    const provider = xchainRPC(chainId)
    const chainDefinition = getChainDefinition(chainId)
    try {
      tokenInfo = await getERC20TokenDetails(chainId, tokenAddress)
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
      if (fetchOptions) fetchOptions.ttl = 1000
    }
  } else {
    canVote = denyWithReason(
      'this poll has some unknown access control settings. (Poll created by newer version of software?)',
    )
  }

  return {
    proof,
    explanation,
    error,
    tokenInfo,
    xChainOptions,
    canVote,
    canManage,
  }
}
