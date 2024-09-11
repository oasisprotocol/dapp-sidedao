import { useEffect, useState } from 'react';
import { useContracts } from './useContracts';
import { useEthereum } from './useEthereum';
import { DecisionWithReason, denyWithReason } from '../components/InputFields';
import { AclOptionsToken, TokenInfo, AclOptionsXchain, xchainRPC, fetchStorageProof } from '@oasisprotocol/side-dao-contracts';
import { BytesLike } from 'ethers';
import { getChainDefinition, getERC20TokenDetails, getSapphireTokenDetails } from '../utils/poll.utils';
import { LoadedPoll } from '../types';

export const usePollPermissions = (poll: LoadedPoll | undefined) => {
  const proposalId = (poll?.proposal as any)?.id as string
  const aclAddress = poll?.proposal.params?.acl

  const eth = useEthereum()
  const {
    pollManagerAddress: daoAddress,
    pollACL,
  } = useContracts(eth, aclAddress)

  const { userAddress } = eth


  const [aclProof, setAclProof] = useState<BytesLike>('');
  const [aclExplanation, setAclExplanation] = useState<string | undefined>()
  const [canAclVote, setCanAclVote] = useState<DecisionWithReason>(true);
  const [canAclManage, setCanAclManage] = useState(false);

  const [aclTokenInfo, setAclTokenInfo] = useState<TokenInfo>();
  const [xchainOptions, setXChainOptions] = useState<AclOptionsXchain | undefined>();

  const checkPermissions = async () => {

    if (proposalId === '0xdemo') {
      setAclProof("")
      setAclExplanation(undefined)
      setCanAclVote(true)
      setAclTokenInfo(undefined)
      setXChainOptions(undefined)
      setCanAclManage(false)
    }

    if (!pollACL || !daoAddress || !poll?.ipfsParams) return

    setCanAclManage(await pollACL.canManagePoll(daoAddress, proposalId, userAddress))

    const isAllowAllACL = 'allowAll' in poll?.ipfsParams.acl.options
    const isTokenHolderACL = 'token' in poll?.ipfsParams.acl.options
    const isWhitelistACL = 'allowList' in poll?.ipfsParams.acl.options
    const isXChainACL = 'xchain' in poll?.ipfsParams.acl.options

    console.log("Checking if we can vote for", proposalId);

    console.log("is allowAll ACL?", isAllowAllACL, "is TokenHolder ACL?", isTokenHolderACL, "is xChain ACL?", isXChainACL, "is WhiteList ACL?", isWhitelistACL,
      "useAddress", userAddress, "daoAddress", daoAddress, "ipfsParams", poll?.ipfsParams)

        if (isAllowAllACL) {
      const newAclProof = new Uint8Array();
      setAclProof(newAclProof);
      const result = 0n != await pollACL.canVoteOnPoll(
        daoAddress,
        proposalId,
        userAddress,
        newAclProof,
      )
      if (result) {
        setCanAclVote(true)
        setAclExplanation("")
      } else {
        setCanAclVote(denyWithReason("some unknown reason"))
      }

    } else if (isWhitelistACL) {
      const newAclProof = new Uint8Array();
      setAclProof(newAclProof);
      const result = 0n != await pollACL.canVoteOnPoll(
        daoAddress,
        proposalId,
        userAddress,
        newAclProof,
      )
      // console.log("whiteListAcl check:", result)
      if (result) {
        setCanAclVote(true)
        setAclExplanation("Only a predefined list of addresses is allowed to vote.")
      } else {
        setCanAclVote(denyWithReason("you are not on the list of allowed addresses"))
      }
    } else if (isTokenHolderACL) {
      const tokenAddress = (poll?.ipfsParams.acl.options as AclOptionsToken).token;
      const tokenDetails = await getSapphireTokenDetails(tokenAddress)
      setAclTokenInfo(tokenDetails)
      // console.log("loaded token details", tokenDetails?.name)
      const newAclProof = new Uint8Array();
      setAclProof(newAclProof);
      try {
        const result = 0n != await pollACL.canVoteOnPoll(
          daoAddress,
          proposalId,
          userAddress,
          newAclProof,
        )
        // console.log("tokenHolderAcl check:", result)
        if (result) {
          setCanAclVote(true)
          setAclExplanation(`You need to hold some ${tokenDetails?.name ?? "specific"} token (on the Sapphire network) to vote.`)
        } else {
          setCanAclVote(denyWithReason(`you don't hold any ${tokenDetails?.name} tokens`))
        }
      } catch {
        setCanAclVote(denyWithReason(`you don't hold any ${tokenDetails?.name} tokens`))
      }

    } else if (isXChainACL) {
      setXChainOptions(poll?.ipfsParams.acl.options as AclOptionsXchain);
      const { xchain: { chainId, blockHash, address: tokenAddress, slot } } = (poll?.ipfsParams.acl.options as AclOptionsXchain)
      const provider = xchainRPC(chainId);
      const chainDefinition = getChainDefinition(chainId)

      if (userAddress) {

        const tokenDetails = await getERC20TokenDetails(chainId, tokenAddress)
        // console.log("Loaded xchain token data", tokenDetails.name)
        // console.log("Creating proof with",
        //   provider,
        //   blockHash,
        //   tokenAddress,
        //   slot,
        //   signer_addr,
        // )
        const newAclProof = await fetchStorageProof(
          provider,
          blockHash,
          tokenAddress,
          slot,
          userAddress,
        );
        setAclProof(newAclProof)
        // console.log("Proof is", newAclProof)
        // console.log("Checking ACL with",
        //   daoAddress, proposalId, userAddress, newAclProof
        // )
        const result = await pollACL.canVoteOnPoll(
          daoAddress,
          proposalId,
          userAddress,
          newAclProof,
        )
        // console.log("xChainAcl check:", result, 0n != result)
        if (0n != result) {
          setCanAclVote(true)
          setAclExplanation(`This poll is restricted to those who have hold ${tokenDetails.name} token on the ${chainDefinition.name} chain when the poll was created.`)
        } else {
          setCanAclVote(denyWithReason(`you don't hold any ${tokenDetails.name} tokens on the ${chainDefinition} chain`))
        }
      } else {
        setCanAclVote(denyWithReason("there is an unknown ACL setting."))
      }
    } else {
      throw new Error("Unknown access policy")
    }
  }

  useEffect(
    () => void checkPermissions(),
    [proposalId, pollACL, daoAddress, poll?.ipfsParams, userAddress]
  );

  return {
    aclProof,
    aclExplanation,
    canAclVote,
    canAclManage,
    // checkIfWeCanVote,
    aclTokenInfo,
    xchainOptions,
  }

}