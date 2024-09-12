import { useContracts } from '../../hooks/useContracts'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { randomchoice } from '@oasisprotocol/side-dao-contracts'
import { ethers, Transaction, TransactionReceipt, ZeroAddress } from 'ethers'
import { DemoNetwork } from '../../utils/crypto.demo'
import { useEthereum } from '../../hooks/useEthereum'
import { DateUtils } from '../../utils/date.utils'
import { closePoll as doClosePoll } from '../../utils/poll.utils'
import { demoSettings, VITE_CONTRACT_POLLMANAGER, VITE_NETWORK_BIGINT } from '../../constants/config'
import { useTime } from '../../hooks/useTime'
import { tuneValue } from '../../utils/tuning'
import { getVerdict } from '../../components/InputFields'
import { useExtendedPoll } from '../../hooks/useExtendedPoll'
import { useProposalFromChain } from '../../hooks/useProposalFromChain'

export const usePollData = (pollId: string) => {
  const eth = useEthereum()
  const { userAddress, isHomeChain } = eth

  const [isVoting, setIsVoting] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [hasClosed, setHasClosed] = useState(false)
  const [selectedChoice, setSelectedChoice] = useState<bigint | undefined>()
  const [existingVote, setExistingVote] = useState<bigint | undefined>(undefined)

  const proposalId = `0x${pollId}`

  const {
    isLoading: isProposalLoading,
    error: proposalError,
    invalidateProposal,
    proposal,
  } = useProposalFromChain(proposalId)

  const {
    isDemo,
    isLoading,
    error,
    poll,
    deadline,
    setDeadline,
    closeDemoPoll,
    votes,
    voteCounts,
    winningChoice,
    pollResults,
    gaslessEnabled,
    gaslessPossible,
    gvAddresses,
    gvBalances,
    invalidateGaslessStatus,
    canAclVote,
    aclExplanation,
    aclError,
    aclProof,
    isMine,
    canAclManage,
  } = useExtendedPoll(proposal, { withResults: true })

  const { now } = useTime(!!deadline)
  const { pollManagerWithSigner: signerDao, gaslessVoting } = useContracts(eth, poll?.proposal.params?.acl)

  const remainingTime = useMemo(
    () => (deadline ? DateUtils.calculateRemainingTimeFrom(deadline, now) : undefined),
    [deadline, now],
  )

  const remainingTimeString = useMemo(
    () => DateUtils.getTextDescriptionOfTime(remainingTime),
    [remainingTime],
  )

  const isPastDue = !!remainingTime?.isPastDue

  const canSelect =
    !remainingTime?.isPastDue &&
    winningChoice === undefined &&
    (eth.state.address === undefined || existingVote === undefined)

  const canVote =
    (!!eth.state.address || isDemo) &&
    !isClosing &&
    winningChoice === undefined &&
    selectedChoice !== undefined &&
    existingVote === undefined &&
    getVerdict(canAclVote)

  const hasWallet = isDemo || (isHomeChain && userAddress !== ZeroAddress)
  const hasWalletOnWrongNetwork = !isDemo && !isHomeChain && userAddress !== ZeroAddress

  const canClose = canAclManage && (!deadline || isPastDue)

  // console.log("canAclManage?", canAclManage, "deadline:", deadline, "isPastDue?", isPastDue, "canClose?", canClose)

  const closePoll = async () => {
    if (!signerDao) throw new Error("Can't close poll with no poll manager.")
    setIsClosing(true)
    try {
      await doClosePoll(eth, signerDao, proposalId)
      setHasClosed(true)
    } catch (e) {
      console.log('Error closing poll:', e)
    } finally {
      setIsClosing(false)
    }
  }

  const moveDemoAfterVoting = () => {
    const remainingSeconds = remainingTime?.totalSeconds
    if (
      !!deadline &&
      !!remainingSeconds &&
      remainingSeconds > demoSettings.jumpToSecondsBeforeClosing + demoSettings.timeContractionSeconds
    ) {
      // Let's quickly get rid of the remaining time.
      tuneValue({
        startValue: deadline,
        transitionTime: demoSettings.timeContractionSeconds,
        endValue:
          Date.now() / 1000 + demoSettings.jumpToSecondsBeforeClosing + demoSettings.timeContractionSeconds,
        stepInMs: 100,
        setValue: setDeadline,
        easing: true,
      })
    }
  }

  const doVote = useCallback(async (): Promise<void> => {
    if (selectedChoice === undefined) throw new Error('no choice selected')

    const choice = selectedChoice

    if (isDemo) {
      if (
        !confirm(
          "Are you sure you want to submit your vote? (Normally you should see a MetaMask popup at this point, but this demo doesn't require any wallet, so this will have to do...)",
        )
      )
        return
      setExistingVote(choice)
      setHasVoted(true)
      moveDemoAfterVoting()
      return
    }

    if (!gaslessVoting) throw new Error('No Gasless Voting!')
    if (!signerDao) throw new Error('No Signer Dao')

    let submitAndPay = true

    if (gaslessPossible) {
      if (!eth.state.signer) {
        throw new Error('No signer!')
      }

      const request = {
        dao: VITE_CONTRACT_POLLMANAGER,
        voter: userAddress,
        proposalId: proposalId,
        choiceId: choice,
      }

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
      )
      const rsv = ethers.Signature.from(signature)

      // Get nonce and random address
      const submitAddr = randomchoice(gvAddresses)
      const submitNonce = await eth.state.provider.getTransactionCount(submitAddr)
      console.log(`Gasless voting, chose address:${submitAddr} (nonce: ${submitNonce})`)

      // Submit voting request to get signed transaction
      const feeData = await eth.state.provider.getFeeData()
      console.log('doVote.gasless: constructing tx', 'gasPrice', feeData.gasPrice)
      const tx = await gaslessVoting.makeVoteTransaction(
        submitAddr,
        submitNonce,
        feeData.gasPrice!,
        request,
        aclProof,
        rsv,
      )

      // Submit pre-signed signed transaction
      let plain_resp
      let receipt: TransactionReceipt | null = null
      try {
        const txDecoded = Transaction.from(tx)
        const txDecodedGas = await eth.state.provider.estimateGas(txDecoded)
        console.log('TxDecodedGas', txDecodedGas)
        plain_resp = await eth.state.provider.broadcastTransaction(tx)
        console.log('doVote.gasless: waiting for tx', plain_resp.hash)
        receipt = await eth.state.provider.waitForTransaction(plain_resp.hash)
      } catch (e: any) {
        if ((e.message as string).includes('insufficient balance to pay fees')) {
          submitAndPay = true
          console.log('Insufficient balance!')
        } else {
          throw e
        }
      }

      // Transaction fails... oh noes
      if (receipt === null || receipt.status != 1) {
        // TODO: how can we tell if it failed due to out of gas?
        // Give them the option to re-submit their vote
        let tx_hash: string = ''
        if (receipt) {
          tx_hash = `\n\nFailed tx: ${receipt.hash}`
        }
        console.log('Receipt is', receipt)
        const result = confirm(
          `Error submitting from subsidy account, submit from your own account? ${tx_hash}`,
        )
        if (result) {
          submitAndPay = true
        } else {
          throw new Error(`gasless voting failed: ${receipt}`)
        }
      } else {
        console.log('doVote.gasless: success')
        submitAndPay = false
      }
    }

    if (submitAndPay) {
      console.log('doVote: casting vote using normal tx')
      await eth.switchNetwork(DemoNetwork.FromConfig)
      const tx = await signerDao.vote(proposalId, choice, aclProof)
      const receipt = await tx.wait()

      if (receipt!.status != 1) throw new Error('cast vote tx failed')
    }

    setExistingVote(choice)
    setHasVoted(true)
  }, [
    selectedChoice,
    gaslessVoting,
    signerDao,
    gaslessPossible,
    eth.state.signer,
    eth.state.provider,
    gvAddresses,
    aclProof,
  ])

  async function vote(): Promise<void> {
    try {
      setIsVoting(true)
      await doVote()
    } catch (e) {
      let errorString = e + ''
      if (errorString.startsWith('Error: user rejected action')) {
        errorString = 'The signer refused to sign this vote.'
      }
      window.alert(`Failed to submit vote: ${errorString}`)
      console.log(e)
    } finally {
      setIsVoting(false)
    }
  }

  const topUp = async (addr: string, amount: bigint) => {
    await eth.state.signer?.sendTransaction({
      to: addr,
      value: amount,
      data: '0x',
    })
    console.log('Top up finished, reloading...')
    invalidateGaslessStatus()
  }

  useEffect(
    // Close the demo time if nothing more is going to happen
    () => {
      if (
        isDemo &&
        poll?.proposal.active &&
        remainingTime?.isPastDue &&
        remainingTime.totalSeconds < demoSettings.waitSecondsBeforeFormallyClosing + 5 &&
        remainingTime.totalSeconds >= demoSettings.waitSecondsBeforeFormallyClosing
      ) {
        closeDemoPoll()
      }
    },
    [deadline, now],
  )

  // if (!isDemo && userAddress === "0x0000000000000000000000000000000000000000") {

  useEffect(() => {
    // Reload poll after closing, expecting results
    if (hasClosed) {
      if (!poll) {
        // console.log("No poll loaded, waiting to load")
      } else if (poll.proposal.active) {
        // console.log("Apparently, we have closed a poll, but we still perceive it as active, so scheduling a reload...")
        setTimeout(() => {
          // console.log("Reloading now")
          invalidateProposal()
        }, 5 * 1000)
      } else {
        // console.log("We no longer perceive it as active, so we can stop reloading")
        setHasClosed(false)
      }
    }
  }, [hasClosed, poll])

  return {
    userAddress,
    hasWallet,
    hasWalletOnWrongNetwork,
    isLoading: isProposalLoading || isLoading,
    error: proposalError ?? error,
    poll,
    active: !!poll?.proposal?.active,

    selectedChoice: winningChoice ?? selectedChoice,
    canSelect,
    setSelectedChoice,

    remainingTime,
    remainingTimeString,

    canAclVote,
    aclExplanation,
    aclError,
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
