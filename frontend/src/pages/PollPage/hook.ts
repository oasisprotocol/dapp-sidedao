import { useContracts } from '../../hooks/useContracts';
import { useCallback, useEffect, useState } from 'react';
import {
  ListOfVotes, Poll, PollManager, PollResults, RemainingTime,
  TokenInfo, AclOptionsXchain, LoadedPoll,
} from '../../types';
import { randomchoice, ERC20TokenDetailsFromProvider, fetchStorageProof, xchainRPC } from '@oasisprotocol/side-dao-contracts';
import {
  BytesLike,
  ethers,
  getBytes,
  JsonRpcProvider,
  Transaction,
  TransactionReceipt,
  ZeroAddress,
} from 'ethers';
import { decryptJSON, DemoNetwork } from '../../utils/crypto.demo';
import { Pinata } from '../../utils/Pinata';
import { useEthereum } from '../../hooks/useEthereum';
import { DateUtils } from '../../utils/date.utils';
import {
  getDemoPoll,
  demoSettings,
  VITE_CONTRACT_POLLMANAGER,
  VITE_NETWORK_BIGINT,
  VITE_CONTRACT_ACL_TOKENHOLDER, VITE_CONTRACT_ACL_VOTERALLOWLIST, VITE_CONTRACT_ACL_STORAGEPROOF,
} from '../../constants/config';
import { useTime } from '../../hooks/useTime';
import { tuneValue } from '../../utils/tuning';
import { useGaslessStatus } from '../../components/PollCard/useGaslessStatus';

type LoadedData =
  [
    boolean,
    bigint,
    PollManager.ProposalParamsStructOutput
  ] & {
  active: boolean;
  topChoice: bigint;
  params: PollManager.ProposalParamsStructOutput;
}

const noVotes: ListOfVotes = { out_count: 0n, out_voters: [], out_choices: [] }

export const usePollData = (pollId: string) => {
  const eth = useEthereum()
  const { userAddress, isHomeChain } = eth


  const proposalId = `0x${pollId}`;
  const isDemo = pollId === "demo"

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [hasClosed, setHasClosed] = useState(false);
  const [pollLoaded, setPollLoaded] = useState(true)
  const [poll, setPoll] = useState<LoadedPoll>();
  const [winningChoice, setWinningChoice] = useState<bigint | undefined>(undefined);
  const [selectedChoice, setSelectedChoice] = useState<bigint | undefined>();
  const [existingVote, setExistingVote] = useState<bigint | undefined>(undefined);
  const [voteCounts, setVoteCounts] = useState<bigint[]>([]);
  const [pollResults, setPollResults] = useState<PollResults>()
  const [votes, setVotes] = useState<ListOfVotes>({ ...noVotes });
  const [canClose, setCanClose] = useState(false);
  const [canAclVote, setCanAclVote] = useState(false);

  const [isTokenHolderACL, setIsTokenHolderACL] = useState(false);
  const [aclTokenInfo, setAclTokenInfo] = useState<TokenInfo>();

  const [isXChainACL, setIsXChainACL] = useState(false);
  const [xchainOptions, setXChainOptions] = useState<AclOptionsXchain | undefined>();
  const [aclProof, setAclProof] = useState<BytesLike>('');
  const [isWhitelistACL, setIsWhitelistACL] = useState(false);

  const [canVote, setCanVote] = useState(false)

  const [canSelect, setCanSelect] = useState(false)
  const [deadline, setDeadline] = useState<number | undefined>()
  const [remainingTime, setRemainingTime] = useState<RemainingTime>()
  const [remainingTimeString, setRemainingTimeString] = useState<string | undefined>()
  const [isMine, setIsMine] = useState(false)
  const [hasWallet, setHasWallet] = useState(false)
  const [hasWalletOnWrongNetwork, setHasWalletOnWrongNetwork] = useState(false)
  const { gaslessEnabled, gaslessPossible, gvAddresses, gvBalances } = useGaslessStatus(proposalId)
  const { now } = useTime()
  const {
    pollManager: dao,
    pollManagerAddress: daoAddress,
    pollManagerWithSigner: signerDao,
    // pollManagerACL
    gaslessVoting,
    pollACL,
  } = useContracts(eth, poll?.proposal.params.acl)

  useEffect(
    () => setCanVote(
      (!!eth.state.address || isDemo) &&
      !isClosing &&
      winningChoice === undefined &&
      selectedChoice !== undefined &&
      existingVote === undefined &&
      canAclVote != false
    ),
    [eth.state.address, winningChoice, selectedChoice, existingVote, isClosing]
  );

  useEffect(
    () => setCanSelect(
      !remainingTime?.isPastDue &&
      (winningChoice === undefined) && (
        (eth.state.address === undefined) ||
        (existingVote === undefined)
      )),
    [winningChoice, eth.state.address, existingVote, remainingTime?.isPastDue]
  );

  useEffect(
    () => {
      if (isDemo) return
      if (pollACL && hasWallet && daoAddress) {
        pollACL.canManagePoll(daoAddress, proposalId, userAddress).then(canManage => {
          const hasCloseTime: boolean = !!poll?.proposal.params.closeTimestamp
          const isPastDue = !!remainingTime?.isPastDue
          const result = canManage && (!hasCloseTime || isPastDue)
          // console.log("canManage?", canManage, "hasCloseTime?", hasCloseTime, "isPastDue?", isPastDue, "result?", result)
          setCanClose(result)
        })
      } else {
        setCanClose(false)
      }
    },
    [pollACL, daoAddress, proposalId, userAddress, hasWallet]
  )

  const closePoll = useCallback(async (): Promise<void> => {
    setIsClosing(true)
    await eth.switchNetwork(); // ensure we're on the correct network first!
    // console.log("Preparing close tx...")
    try {
      const tx = await signerDao!.close(proposalId);
    // console.log('Close proposal tx', tx);

      const receipt = await tx.wait();

      if (receipt!.status != 1) throw new Error('close ballot tx failed');
      else {
        setHasClosed(true)
      }
    } catch (e) {
      console.log("TX close problem", e)
    } finally {
      setIsClosing(false)
    }
  }, [eth, proposalId, signerDao])

  const doVote = useCallback(async (): Promise<void> => {
    if (selectedChoice === undefined) throw new Error('no choice selected');

    const choice = selectedChoice;

    if (isDemo) {
      if (!confirm("Are you sure you want to submit your vote? (Normally you should see a MetaMask popup at this point, but this demo doesn't require any wallet, so this will have to do...)")) return
      setExistingVote(choice)
      setHasVoted(true)
      const remainingSeconds = remainingTime?.totalSeconds
      if (!!deadline && !!remainingSeconds && remainingSeconds > demoSettings.jumpToSecondsBeforeClosing + demoSettings.timeContractionSeconds) {
        // Let's quickly get rid of the remaining time.
        tuneValue({
          startValue: deadline,
          transitionTime: demoSettings.timeContractionSeconds,
          endValue: Date.now() / 1000 + demoSettings.jumpToSecondsBeforeClosing + demoSettings.timeContractionSeconds,
          stepInMs: 100,
          setValue: setDeadline,
          easing: true,
        })
      }
      return
    }

    if (!gaslessVoting) throw new Error('No Gasless Voting!');
    if (!signerDao) throw new Error('No Signer Dao');

    let submitAndPay = true;

    if (gaslessPossible) {
      if (!eth.state.signer) {
        throw new Error('No signer!');
      }

      const request = {
        dao: VITE_CONTRACT_POLLMANAGER,
        voter: await eth.state.signer.getAddress(),
        proposalId: proposalId,
        choiceId: choice,
      };

      // Sign voting request
      const signature = await eth.state.signer.signTypedData(
        {
          name: 'GaslessVoting',
          version: '1',
          chainId: VITE_NETWORK_BIGINT,
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
    setHasVoted(true)
  }, [selectedChoice, gaslessVoting, signerDao, gaslessPossible, eth.state.signer, eth.state.provider, gvAddresses, aclProof])

  async function vote(): Promise<void> {
    try {
      setError("")
      setIsVoting(true)
      await doVote();
    } catch (e) {
      let errorString = e + ""
      if (errorString.startsWith("Error: user rejected action")) {
        errorString = "The signer refused to sign this vote."
      }
      window.alert(`Failed to submit vote: ${errorString}`)
      console.log(e);
    } finally {
      setIsVoting(false)
    }
  }

  const topUp = useCallback(async (addr: string, amount: bigint) => {
    await eth.state.signer?.sendTransaction({
      to: addr,
      value: amount,
      data: '0x',
    });
    console.log("Top up finished, reloading...");
    setPollLoaded(false)
  }, [eth.state.signer, setPollLoaded])

  useEffect(
    ( ) => setPollLoaded(false),
    [pollId]
  );

  useEffect(() => {
    if (isDemo) {
      setDeadline(now + demoSettings.timeForVoting)
    } else {
      setDeadline(poll?.ipfsParams.options.closeTimestamp)
    }
  }, [poll])

  useEffect(
    () => {
      const remaining = deadline ? DateUtils.calculateRemainingTimeFrom(deadline, now) : undefined;
      setRemainingTime(remaining)
      setRemainingTimeString(DateUtils.getTextDescriptionOfTime(remaining))
      if (
        isDemo &&
        poll?.proposal.active &&
        remaining?.isPastDue &&
        remaining.totalSeconds < (demoSettings.waitSecondsBeforeFormallyClosing + 5) &&
        remaining.totalSeconds >= demoSettings.waitSecondsBeforeFormallyClosing
      ) {
        // Let's formally close the poll
        setPoll({
          ...poll,
          proposal: {
            ...poll.proposal,
            active: false,
            topChoice: 0n,
          }
        } as any)
        // Get some random vote numbers
        const voteNumbers = poll.ipfsParams.choices.map(() => Math.round(Math.random()*100))
        const voteBigInts = voteNumbers.map(BigInt)
        // Let's pick a winner
        const winningIndexNumber = voteNumbers.indexOf(Math.max(...voteNumbers))
        const winningIndexBigInt = BigInt(winningIndexNumber)
        // Simulate loading the results
        setTimeout(
          () => {
            setVoteCounts(voteBigInts)
            setWinningChoice(winningIndexBigInt)
            setSelectedChoice(winningIndexBigInt)
          }, 1000
        )
      }
    },
    [deadline, now],
  )

  const loadProposal = useCallback(async () => {
    if (!dao || !daoAddress || !pollACL || !gaslessVoting) {
      // console.log("not loading, because dependencies are not yet available")
      return
    }
    if (pollLoaded) {
      // console.log("not loading, because already loaded")
      return
    }
    // console.log("Attempting to load", proposalId)

    setPoll(undefined)

    if (isDemo) {
      setPoll(getDemoPoll())
      setVoteCounts([])
      setWinningChoice(undefined)
      setVotes({...noVotes})
      setIsTokenHolderACL(false)
      setIsWhitelistACL(false)
      setIsXChainACL(false)
      setCanAclVote(true)
      setHasWallet(true)
      setHasWalletOnWrongNetwork(false)
      setCanClose(false)
      return
    }

    let loadedData: LoadedData
    try {
      setIsLoading(true)
      loadedData = await dao.PROPOSALS(proposalId);
      setError("")
    } catch(ex) {
      setError("Failed to load poll. Are you sure the link is correct?")
      setPoll(undefined)
      return
    } finally {
      setPollLoaded(true)
      setIsLoading(false)
    }
    // console.log("Loaded data is", loadedData)
    const { active, params, topChoice } = loadedData;
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

    setIsTokenHolderACL(params.acl == VITE_CONTRACT_ACL_TOKENHOLDER);
    setIsWhitelistACL(params.acl == VITE_CONTRACT_ACL_VOTERALLOWLIST);
    setIsXChainACL(params.acl == VITE_CONTRACT_ACL_STORAGEPROOF);

    if (!('xchain' in ipfsParams.acl.options)) {
      if ('token' in ipfsParams.acl.options) {
        const tokenAddress = ipfsParams.acl.options.token;
        const newAclProof = new Uint8Array();
        setAclProof(newAclProof);
        setCanAclVote(0n != (await pollACL.canVoteOnPoll(
          daoAddress,
          proposalId,
          userAddress,
          newAclProof,
        )));
        setAclTokenInfo(await ERC20TokenDetailsFromProvider(
          tokenAddress,
          eth.state.provider as unknown as JsonRpcProvider,
        ));
      } else if ('allowList' in ipfsParams.acl.options) {
        const newAclProof = new Uint8Array();
        setAclProof(newAclProof);
        setCanAclVote(0n != (await pollACL.canVoteOnPoll(
          daoAddress,
          proposalId,
          userAddress,
          newAclProof,
        )));
      } else if ('allowAll' in ipfsParams.acl.options) {
        const newAclProof = new Uint8Array();
        setAclProof(newAclProof);
        setCanAclVote(0n != (await pollACL.canVoteOnPoll(
          daoAddress,
          proposalId,
          userAddress,
          newAclProof,
        )));
      }
    } else {
      const xchain = (ipfsParams.acl.options as AclOptionsXchain).xchain;
      const provider = xchainRPC(xchain.chainId);
      setXChainOptions(ipfsParams.acl.options);
      const signer_addr = await eth.state.signer?.getAddress();

      if (signer_addr) {
        const newAclProof = await fetchStorageProof(
          provider,
          xchain.blockHash,
          xchain.address,
          xchain.slot,
          signer_addr,
        );
        setAclProof(newAclProof)
        setCanAclVote(0n != (await pollACL.canVoteOnPoll(
          daoAddress,
          proposalId,
          userAddress,
          newAclProof,
        )));
      }
    }

  }, [dao, daoAddress, pollACL, gaslessVoting, userAddress, pollLoaded, eth.state.provider, xchainRPC, eth.state.signer, fetchStorageProof]);

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
        const noVotes = !loadedPollResults.totalVotes
        poll.ipfsParams.choices.forEach((choice, index) => {
          loadedPollResults.choices[index.toString()] = {
            choice,
            votes: voteCounts[index],
            rate: noVotes ? 0 : Math.round(Number(1000n * voteCounts[index] / loadedPollResults.totalVotes) / 10),
            winner: index.toString() === winningChoice?.toString()
          }
        })
        setPollResults(loadedPollResults)
      }
    }, [poll, voteCounts, winningChoice, votes]
  )

  useEffect(()=>{
    if (hasClosed) {
      if (!poll) {
        // console.log("No poll loaded, waiting to load")
      } else if (poll.proposal.active) {
        // console.log("Apparently, we have closed a poll, but we still perceive it as active, so scheduling a reload...")
        setTimeout(() => {
          // console.log("Reloading now")
          setPollLoaded(false)
        }, 5 * 1000)
      } else {
        // console.log("We no longer perceive it as active, so we can stop reloading")
        setHasClosed(false)
      }
    }
  }, [hasClosed, poll])

  useEffect(
    () => {
      void loadProposal()
    },
    [dao, daoAddress, pollACL, gaslessVoting, userAddress, pollLoaded]
  );

  useEffect(() => {
    if (isDemo) return
    setIsMine(poll?.ipfsParams.creator?.toLowerCase() === userAddress.toLowerCase())
  }, [poll, userAddress])

  useEffect(() => {
    if (isDemo) return
    setHasWallet(isHomeChain && userAddress !== ZeroAddress)
    setHasWalletOnWrongNetwork(!isHomeChain && userAddress !== ZeroAddress)
  }, [userAddress, isHomeChain])

  return {
    userAddress,
    hasWallet,
    hasWalletOnWrongNetwork,
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

    remainingTime,
    remainingTimeString,

    canVote,
    gaslessEnabled,
    gaslessPossible,
    gvAddresses,
    gvBalances,

    vote,
    isVoting,
    hasVoted,
    existingVote,

    topUp,

    isMine,
    canClose,
    closePoll,
    isClosing,
    hasClosed,

    voteCounts,
    winningChoice,
    pollResults,

    votes,

  }
}

export type PollData = ReturnType<typeof usePollData>