import { AbiCoder, BytesLike, getAddress, JsonRpcProvider, ParamType } from 'ethers'

import {
  chain_info,
  erc20TokenDetailsFromProvider,
  xchainRPC,
  AclOptions,
  guessStorageSlot,
  getNftContractType,
  ChainDefinition,
  AclOptionsXchain,
  IPollACL__factory,
  TokenInfo,
  NFTInfo,
  nftDetailsFromProvider,
  ContractType,
} from '@oasisprotocol/blockvote-contracts'
export type { ContractType, NftType } from '@oasisprotocol/blockvote-contracts'
export { isToken } from '@oasisprotocol/blockvote-contracts'
import { Poll, PollManager } from '../types'
import { encryptJSON } from './crypto.demo'
import { Pinata } from './Pinata'
import { EthereumContext } from '../providers/EthereumContext'
import { DecisionWithReason, denyWithReason } from '../components/InputFields'
import { FetcherFetchOptions } from './StoredLRUCache'
import { findACLForOptions } from '../components/ACLs'

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
export const abiEncode = (types: ReadonlyArray<string | ParamType>, values: ReadonlyArray<any>): string => {
  const abi = AbiCoder.defaultAbiCoder()
  return abi.encode(types, values)
}

export const getERC20TokenDetails = async (chainId: number, address: string) => {
  const rpc = xchainRPC(chainId)
  try {
    return await erc20TokenDetailsFromProvider(getAddress(address), rpc)
  } catch {
    return undefined
  }
}

export const getNftDetails = async (chainId: number, address: string) => {
  const rpc = xchainRPC(chainId)
  try {
    return await nftDetailsFromProvider(getAddress(address), rpc)
  } catch {
    return undefined
  }
}

export const getContractDetails = async (chainId: number, address: string) =>
  (await getERC20TokenDetails(chainId, address)) ?? (await getNftDetails(chainId, address))

export const getChainDefinition = (chainId: number): ChainDefinition => chain_info[chainId]

export const checkXchainTokenHolder = async (
  chainId: number,
  tokenAddress: string,
  contractType: ContractType,
  holderAddress: string,
  isStillFresh: () => boolean = () => true,
  progressCallback?: (progress: string) => void,
) => {
  const rpc = xchainRPC(chainId)
  try {
    return await guessStorageSlot(
      rpc,
      tokenAddress,
      contractType,
      holderAddress,
      'latest',
      isStillFresh,
      progressCallback,
    )
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
  tokenInfo?: TokenInfo | NFTInfo | undefined
  xChainOptions?: AclOptionsXchain | undefined
  error: string
}

export type CheckPermissionInputs = {
  userAddress: string
  proposalId: string
  aclAddress: string
  options: AclOptions
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
  const canManage = await pollACL.canManagePoll(daoAddress, proposalId, userAddress)
  const acl = findACLForOptions(options)

  if (!acl) {
    return {
      proof: '',
      explanation: '',
      canVote: denyWithReason(
        'this poll has some unknown access control settings. (Poll created by newer version of software?)',
      ),
      tokenInfo: undefined,
      xChainOptions: undefined,
      error: '',
      canManage,
    }
  }

  const {
    canVote,
    explanation,
    proof,
    error = '',
    ...extra
  } = await acl.checkPermission(pollACL, daoAddress, proposalId, userAddress, options as any)

  if (error && fetchOptions) fetchOptions.ttl = 1000

  return {
    proof,
    explanation,
    error,
    ...extra,
    canVote,
    canManage,
  }
}
