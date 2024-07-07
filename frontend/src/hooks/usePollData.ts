import { EthereumContext } from '../providers/EthereumContext';
import { useContracts } from './useContracts';
import { PollManager } from '@oasisprotocol/side-dao-contracts';
import { useCallback, useEffect, useState } from 'react';
import { Poll } from '../types';
import {
  TokenInfo, AclOptionsXchain, randomchoice,
  tokenDetailsFromProvider,
  fetchStorageProof, xchainRPC
} from '@oasisprotocol/side-dao-contracts';
import {
  BytesLike,
  ethers,
  // formatEther,
  getBytes,
  JsonRpcProvider,
  parseEther,
  Transaction,
  TransactionReceipt,
  ZeroAddress,
} from 'ethers';
import { decryptJSON, DemoNetwork } from '../utils/crypto.demo';
import { Pinata } from '../utils/Pinata';

type LoadedPoll = PollManager.ProposalWithIdStructOutput & { ipfsParams: Poll; };

export type ListOfVotes = {
  out_count: bigint;
  out_voters: string[];
  out_choices: PollManager.ChoiceStructOutput[];
};

export type PollResults = {
  totalVotes: bigint,
  choices: Record<string, {
    choice: string,
    votes: bigint,
    rate: number,
    winner: boolean
  }>
  winner: string,
  votes?: ListOfVotes | undefined
}

const noVotes: ListOfVotes = { out_count: 0n, out_voters: [], out_choices: [] }

export const usePollData = (eth: EthereumContext, pollId: string) => {
  const { userAddress } = eth
  const {
    pollManager: dao,
    pollManagerAddress: daoAddress,
    pollManagerWithSigner: signerDao,
    // pollManagerACL
    gaslessVoting,
    pollACL,
  } = useContracts(eth)

  const proposalId = `0x${pollId}`;

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [poll, setPoll] = useState<LoadedPoll>();
  const [winningChoice, setWinningChoice] = useState<bigint | undefined>(undefined);
  const [selectedChoice, setSelectedChoice] = useState<bigint | undefined>();
  const [existingVote, setExistingVote] = useState<bigint | undefined>(undefined);
  const [voteCounts, setVoteCounts] = useState<bigint[]>([]);
  const [pollResults, setPollResults] = useState<PollResults>()
  const [votes, setVotes] = useState<ListOfVotes>({ ...noVotes });
  const [canClosePoll, setCanClosePoll] = useState<Boolean>(false);
  const [canAclVote, setCanAclVote] = useState<Boolean>(false);
  const [gvAddresses, setGvAddresses] = useState<string[]>([]);
  const [gvBalances, setGvBalances] = useState<bigint[]>([]);
  const [gvTotalBalance, setGvTotalBalance] = useState<bigint>(0n);
  const [isTokenHolderACL, setIsTokenHolderACL] = useState(false);
  const [aclTokenInfo, setAclTokenInfo] = useState<TokenInfo>();

  const [isXChainACL, setIsXChainACL] = useState(false);
  const [xchainOptions, setXChainOptions] = useState<AclOptionsXchain | undefined>();
  let aclProof: BytesLike = '';
  const [isWhitelistACL, setIsWhitelistACL] = useState(false);

  const [canVote, setCanVote] = useState(false)

  const [canSelect, setCanSelect] = useState(false)

  useEffect(
    () => setCanVote(!!eth.state.address &&
      winningChoice === undefined &&
      selectedChoice !== undefined &&
      existingVote === undefined &&
      canAclVote != false
    ),
    [eth.state.address, winningChoice, selectedChoice, existingVote]
  );

  useEffect(
    () => setCanSelect(
      (winningChoice === undefined) && (
        (eth.state.address === undefined) ||
        (existingVote === undefined)
      )),
    [winningChoice, eth.state.address, existingVote]
  );

  useEffect(
    () => {
      if (pollACL && userAddress && daoAddress) {
        pollACL.canManagePoll(daoAddress, proposalId, userAddress).then(setCanClosePoll)
      } else {
        setCanClosePoll(false)
      }
    },
    [pollACL, daoAddress, proposalId, userAddress]
  )

  const closePoll = useCallback(async (): Promise<void> => {
    await eth.switchNetwork(); // ensure we're on the correct network first!
    const tx = await signerDao!.close(proposalId);
    console.log('Close proposal tx', tx);
    setIsClosing(true)
    try {
      const receipt = await tx.wait();

      if (receipt!.status != 1) throw new Error('close ballot tx failed');
      else {
        setIsClosed(true)
      }
    } catch (e) {
      console.log(e);
    } finally {
      setIsClosing(false)
    }
  }, [eth, proposalId])

  const doVote = useCallback(async (): Promise<void> => {
    if (selectedChoice === undefined) throw new Error('no choice selected');

    const choice = selectedChoice;

    if (!gaslessVoting) throw new Error('No Gasless Voting!');
    if (!signerDao) throw new Error('No Signer Dao');

    let submitAndPay = true;

    if (gvTotalBalance > 0n) {
      if (!eth.state.signer) {
        throw new Error('No signer!');
      }

      const request = {
        dao: import.meta.env.VITE_CONTRACT_POLLMANAGER,
        voter: await eth.state.signer.getAddress(),
        proposalId: proposalId,
        choiceId: choice,
      };

      // Sign voting request
      const signature = await eth.state.signer.signTypedData(
        {
          name: 'GaslessVoting',
          version: '1',
          chainId: import.meta.env.VITE_NETWORK,
          verifyingContract: await gaslessVoting.getAddress(),
        },
        {
          VotingRequest: [
            { name: 'voter', type: 'address' },
            { name: 'dao', type: 'address' },
            { name: 'proposalId', type: 'bytes32' },
            { name: 'choiceId', type: 'uint256' },
          ],
        },
        request,
      );
      const rsv = ethers.Signature.from(signature);

      // Get nonce and random address
      const submitAddr = randomchoice(gvAddresses);
      const submitNonce = await eth.state.provider.getTransactionCount(submitAddr);
      console.log(`Gasless voting, chose address:${submitAddr} (nonce: ${submitNonce})`);

      // Submit voting request to get signed transaction
      const feeData = await eth.state.provider.getFeeData();
      console.log('doVote.gasless: constructing tx', 'gasPrice', feeData.gasPrice);
      const tx = await gaslessVoting.makeVoteTransaction(
        submitAddr,
        submitNonce,
        feeData.gasPrice!,
        request,
        aclProof,
        rsv,
      );

      // Submit pre-signed signed transaction
      let plain_resp;
      let receipt: TransactionReceipt | null = null;
      try {
        const txDecoded = Transaction.from(tx);
        const txDecodedGas = await eth.state.provider.estimateGas(txDecoded);
        console.log('TxDecodedGas', txDecodedGas);
        plain_resp = await eth.state.provider.broadcastTransaction(tx);
        console.log('doVote.gasless: waiting for tx', plain_resp.hash);
        receipt = await eth.state.provider.waitForTransaction(plain_resp.hash);
      } catch (e: any) {
        if ((e.message as string).includes('insufficient balance to pay fees')) {
          submitAndPay = true;
          console.log('Insufficient balance!');
        } else {
          throw e;
        }
      }

      // Transaction fails... oh noes
      if (receipt === null || receipt.status != 1) {
        // TODO: how can we tell if it failed due to out of gas?
        // Give them the option to re-submit their vote
        let tx_hash: string = '';
        if (receipt) {
          tx_hash = `\n\nFailed tx: ${receipt.hash}`;
        }
        console.log('Receipt is', receipt);
        const result = confirm(
          `Error submitting from subsidy account, submit from your own account? ${tx_hash}`,
        );
        if (result) {
          submitAndPay = true;
        } else {
          throw new Error(`gasless voting failed: ${receipt}`);
        }
      } else {
        console.log('doVote.gasless: success');
        submitAndPay = false;
      }
    }

    if (submitAndPay) {
      console.log('doVote: casting vote using normal tx');
      await eth.switchNetwork(DemoNetwork.FromConfig);
      const tx = await signerDao.vote(proposalId, choice, aclProof);
      const receipt = await tx.wait();

      if (receipt!.status != 1) throw new Error('cast vote tx failed');
    }

    setExistingVote(choice);
  }, [selectedChoice, gaslessVoting, signerDao, gvTotalBalance, eth.state.signer, eth.state.provider, gvAddresses, aclProof])

  async function vote(e: Event): Promise<void> {
    e.preventDefault();
    try {
      setError("")
      setIsLoading(true)
      await doVote();
      setHasVoted(true)
      //} catch (e: any) {
      //  error.value = e.reason ?? e.message;
    } finally {
      setIsLoading(false)
    }
  }

  const doTopUp = useCallback(async (addr: string) => {
    let result = prompt(`TopUp voting subsidy account:\n\n  ${addr}\n\nAmount (in ROSE):`, '1');
    if (!result) {
      return;
    }
    result = result.trim();
    const amount = parseEther(result);
    if (amount > 0n) {
      await eth.state.signer?.sendTransaction({
        to: addr,
        value: amount,
        data: '0x',
      });
    }
  }, [eth.state.signer])

  const [initiated, setInitiated] = useState(false)

  const loadProposal = useCallback(async () => {
    if (!dao || !daoAddress || !pollACL || !gaslessVoting || !userAddress) return
    if (initiated) return
    setInitiated(true)
    const { active, params, topChoice } = await dao.PROPOSALS(proposalId);
    if (params.acl === ZeroAddress) {
      console.log(`Empty params! No ACL, Poll ${proposalId} not found!`);
      // router.push({ path: `/NotFound/poll/${props.id}`, replace: true });
      // TODO: should go to 404
      return;
    }

    const proposal = { id: proposalId, active, topChoice, params };
    const ipfsData = await Pinata.fetchData(params.ipfsHash);
    const ipfsParams: Poll = decryptJSON(getBytes(proposal.params.ipfsSecret), ipfsData);
    const loadedPoll =
      {
        proposal,
        ipfsParams
      } as unknown as LoadedPoll

    setPoll(loadedPoll);
    if (!proposal.active) {

      const voteCounts = (await dao.getVoteCounts(proposalId)).slice(0, ipfsParams.choices.length)
      setVoteCounts(voteCounts)
      setSelectedChoice(proposal.topChoice);
      setWinningChoice(proposal.topChoice);

      if (proposal.params.publishVotes) {
        setVotes(await dao.getVotes(proposalId, 0, 10));
      } else {
        setVotes({...noVotes})
      }
    } else {
      setVoteCounts([])
      setWinningChoice(undefined)
      setVotes({...noVotes})
    }

    setIsTokenHolderACL(params.acl == import.meta.env.VITE_CONTRACT_ACL_TOKENHOLDER);
    setIsWhitelistACL(params.acl == import.meta.env.VITE_CONTRACT_ACL_VOTERALLOWLIST);
    setIsXChainACL(params.acl == import.meta.env.VITE_CONTRACT_ACL_STORAGEPROOF);

    if (!('xchain' in ipfsParams.acl.options)) {
      if ('token' in ipfsParams.acl.options) {
        const tokenAddress = ipfsParams.acl.options.token;
        const aclProof = new Uint8Array();
        setCanAclVote(0n != (await pollACL.canVoteOnPoll(
          daoAddress,
          proposalId,
          userAddress,
          aclProof,
        )));
        setAclTokenInfo(await tokenDetailsFromProvider(
          tokenAddress,
          eth.state.provider as unknown as JsonRpcProvider,
        ));
      } else if ('allowList' in ipfsParams.acl.options) {
        aclProof = new Uint8Array();
        setCanAclVote(0n != (await pollACL.canVoteOnPoll(
          daoAddress,
          proposalId,
          userAddress,
          aclProof,
        )));
      } else if ('allowAll' in ipfsParams.acl.options) {
        aclProof = new Uint8Array();
        setCanAclVote(0n != (await pollACL.canVoteOnPoll(
          daoAddress,
          proposalId,
          userAddress,
          aclProof,
        )));
      }
    } else {
      const xchain = (ipfsParams.acl.options as AclOptionsXchain).xchain;
      const provider = xchainRPC(xchain.chainId);
      setXChainOptions(ipfsParams.acl.options);
      const signer_addr = await eth.state.signer?.getAddress();

      if (signer_addr) {
        aclProof = await fetchStorageProof(
          provider,
          xchain.blockHash,
          xchain.address,
          xchain.slot,
          signer_addr,
        );
        setCanAclVote(0n != (await pollACL.canVoteOnPoll(
          daoAddress,
          proposalId,
          userAddress,
          aclProof,
        )));
      }
    }

    // Retrieve gasless voting addresses & balances
    const addressBalances = await gaslessVoting.listAddresses(daoAddress, proposalId);
    setGvAddresses(addressBalances.out_addrs);
    setGvBalances(addressBalances.out_balances);
    if (addressBalances.out_balances.length > 0) {
      setGvTotalBalance(addressBalances.out_balances.reduce((a, b) => a + b));
    } else {
      setGvTotalBalance(0n);
    }

  }, [dao, daoAddress, pollACL, gaslessVoting, userAddress, initiated, eth.state.provider, xchainRPC, eth.state.signer, fetchStorageProof]);

  useEffect(
    () => {
      if (!poll || poll.proposal.active || !voteCounts.length) {
        setPollResults(undefined)
      } else {
        const loadedPollResults: PollResults = {
          totalVotes: voteCounts.reduce((a, b) => a + b),
          choices: {},
          winner: poll.proposal.topChoice.toString(),
          votes,
        }
        poll.ipfsParams.choices.forEach((choice, index) => {
          loadedPollResults.choices[index.toString()] = {
            choice,
            votes: voteCounts[index],
            rate: Math.round(Number(1000n * voteCounts[index] / loadedPollResults.totalVotes) / 10),
            winner: index.toString() === winningChoice?.toString()
          }
        })
        setPollResults(loadedPollResults)
      }
    }, [poll, voteCounts, winningChoice, votes]
  )

  // useEffect(() => {
  //   if (gvTotalBalance > 0n) {
  //     console.log(
  //       'Gasless voting available',
  //       formatEther(gvTotalBalance),
  //       'ROSE balance, addresses:',
  //       gvAddresses.join(', '),
  //     );
  //   }
  // }, [gvTotalBalance, gvAddresses]);

  useEffect(
    () => { void loadProposal() },
    [dao, daoAddress, pollACL, gaslessVoting, userAddress]
  );

  return {
    isLoading,
    error,
    poll,
    active: !!poll?.proposal?.active,

    isTokenHolderACL,
    isWhitelistACL,
    isXChainACL,
    aclTokenInfo,
    xchainOptions,

    selectedChoice,
    canSelect,
    setSelectedChoice,

    canVote,
    vote,
    hasVoted,
    existingVote,

    gvBalances,
    doTopUp,

    canClosePoll,
    closePoll,
    isClosing,
    isClosed,

    voteCounts,
    winningChoice,
    pollResults,

    votes,

  }
}
