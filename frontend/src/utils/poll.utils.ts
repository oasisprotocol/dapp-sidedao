import { AbiCoder, getAddress, ParamType } from 'ethers';

import {
  xchain_ChainNamesToChainId,
  tokenDetailsFromProvider,
  xchainRPC,
  AclOptions,
  isERCTokenContract,
  guessStorageSlot,
  getBlockHeaderRLP,
  fetchAccountProof,
} from '@oasisprotocol/side-dao-contracts';
import {
  VITE_CONTRACT_ACL_ALLOWALL,
  VITE_CONTRACT_ACL_STORAGEPROOF,
  VITE_CONTRACT_ACL_TOKENHOLDER,
  VITE_CONTRACT_ACL_VOTERALLOWLIST,
} from '../constants/config'
import { Poll, PollManager } from "../types"
import { encryptJSON } from './crypto.demo';
import { Pinata } from './Pinata';

export { parseEther} from "ethers"

// A mapping from chain name to chain IDs
export const chains = xchain_ChainNamesToChainId

// Check if an address is valid
export const isValidAddress = (address: string) => {
  try {
    getAddress(address)
  } catch (e: any) {
    if (e.code == 'INVALID_ARGUMENT') {
      return false
    } else {
      console.log("Unknown problem:", e)
      return true
    }
  }
  return true
}

export const getSapphireTokenDetails = async (address: string) => {
  const chainId = 23294
  const rpc = xchainRPC(chainId);
  try {
    return await tokenDetailsFromProvider(getAddress(address), rpc);
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
  const abi = AbiCoder.defaultAbiCoder();
  return abi.encode(types, values)
}

export const getAllowAllACLOptions = (): [string, AclOptions] => {
  return [
    '0x', // Empty bytes is passed
    {
      address: VITE_CONTRACT_ACL_ALLOWALL,
      options: { allowAll: true },
    },
  ];
}

export const getAllowListAclOptions = (addresses: string[]): [string, AclOptions] => {
  return [
    abiEncode(['address[]'], [addresses]),
    {
      address: VITE_CONTRACT_ACL_VOTERALLOWLIST,
      options: { allowList: true },
    },
  ];
}

export const getTokenHolderAclOptions = (tokenAddress: string): [string, AclOptions] => {
  return [
    abiEncode(['address'], [tokenAddress]),
    {
      address: VITE_CONTRACT_ACL_TOKENHOLDER,
      options: { token: tokenAddress },
    },
  ];
}

export const getXchainAclOptions = async (
  props: {
    chainName: string,
    contractAddress: string,
    slotNumber: number,
    blockHash: string,
  },
  updateStatus?: ((status: string | undefined) => void) | undefined,
): Promise<[string, AclOptions]> => {
  const showStatus = updateStatus ?? ((message?: string | undefined) => console.log(message))
  const { chainName, contractAddress, slotNumber, blockHash } = props
  const chainId = chains[chainName]
  const rpc = xchainRPC(chainId);
  showStatus("Getting block header RLP")
  const headerRlpBytes = await getBlockHeaderRLP(rpc, blockHash);
  // console.log('headerRlpBytes', headerRlpBytes);
  showStatus("Fetching account proof")
  const rlpAccountProof = await fetchAccountProof(rpc, blockHash, contractAddress);
  // console.log('rlpAccountProof', rlpAccountProof);
  return [
    abiEncode(
      ['tuple(tuple(bytes32,address,uint256),bytes,bytes)'],
      [
        [
          [
            blockHash,
            contractAddress,
            slotNumber,
          ],
          headerRlpBytes,
          rlpAccountProof,
        ],
      ],
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
  ];
}

export const isXchainToken = async (chainName: string, address: string) => {
  const chainId = chains[chainName]
  const rpc = xchainRPC(chainId);
  return await isERCTokenContract(rpc, address)
}

export const getXchainTokenDetails = async (chainName: string, address: string) => {
  const chainId = chains[chainName]
  const rpc = xchainRPC(chainId);
  return await tokenDetailsFromProvider(getAddress(address), rpc);
}

export const checkXchainTokenHolder = async (chainName: string, tokenAddress: string, holderAddress: string, progressCallback?: (progress: string) => void) => {
  const chainId = chains[chainName]
  const rpc = xchainRPC(chainId);
  try {
    return await guessStorageSlot(rpc, tokenAddress, holderAddress, "latest", progressCallback)
  } catch (_) {
    return undefined
  }
}

export const getXchainBlock = async (chainName: string) => {
  const chainId = chains[chainName]
  const rpc = xchainRPC(chainId);
  return rpc.getBlock("latest");
}

export const createPoll = async (
  pollManager: PollManager,
  creator: string,
  props: {
    question: string,
    description: string,
    answers: string[],
    aclData: string,
    aclOptions: AclOptions,
    subsidizeAmount: bigint | undefined,
    publishVotes: boolean,
    closeTime: Date | undefined,
  },
  updateStatus: (message: string) => void,
) => {
  const {
    question, description, answers,
    aclData, aclOptions,
    subsidizeAmount,
    publishVotes, closeTime,
  } = props

  updateStatus("Compiling data")
  const poll: Poll = {
    creator,
    name: question,
    description,
    choices: answers,
    options: {
      publishVotes,
      closeTimestamp: closeTime ? closeTime.getTime() / 1000 : 0,
    },
    acl: aclOptions,
  };

  const { key, cipherbytes } = encryptJSON(poll);

  updateStatus("Saving poll data to IPFS")
  const ipfsHash = await Pinata.pinData(cipherbytes);

  if (!ipfsHash) throw new Error("Failed to save to IPFS, try again!")
  // console.log('Poll ipfsHash', ipfsHash);
  // updateStatus("Saved to IPFS")

  const proposalParams: PollManager.ProposalParamsStruct = {
    ipfsHash,
    ipfsSecret: key,
    numChoices: answers.length,
    publishVotes: poll.options.publishVotes,
    closeTimestamp: poll.options.closeTimestamp,
    acl: aclOptions.address,
  };

  // console.log("params are", proposalParams)

  updateStatus("Calling signer")
  const createProposalTx = await pollManager.create(proposalParams, aclData, {
    value: subsidizeAmount ?? 0n,
  });
  // console.log('doCreatePoll: creating proposal tx', createProposalTx.hash);

  updateStatus("Sending transaction")

  const receipt = (await createProposalTx.wait())!;
  if (receipt.status !== 1) {
    throw new Error('createProposal tx receipt reported failure.');
  }
  const proposalId = receipt.logs[0].data;

  updateStatus("Created poll")

  // console.log('doCreatePoll: Proposal ID', proposalId);

  return proposalId;
}