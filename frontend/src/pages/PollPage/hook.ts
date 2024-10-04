import { useContracts } from '../../hooks/useContracts'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { randomchoice } from '@oasisprotocol/blockvote-contracts'
import { ethers, Transaction, TransactionReceipt, ZeroAddress } from 'ethers'
import { ConfiguredNetwork } from '../../utils/crypto.demo'
import { useEthereum } from '../../hooks/useEthereum'
import { DateUtils } from '../../utils/date.utils'
import { completePoll as doCompletePoll, destroyPoll as doDestroyPoll } from '../../utils/poll.utils'
import {
  demoSettings,
  designDecisions,
  VITE_CONTRACT_POLLMANAGER,
  VITE_NETWORK_BIGINT,
} from '../../constants/config'
import { useTime } from '../../hooks/useTime'
import { tuneValue } from '../../utils/tuning'
import { getVerdict } from '../../components/InputFields'
import { useExtendedPoll } from '../../hooks/useExtendedPoll'
import { useProposalFromChain } from '../../hooks/useProposalFromChain'
import { useNavigate } from 'react-router-dom'
import { isPollActive } from '../../types'

export const usePollData = (pollId: string) => {
  const navigate = useNavigate()
  const eth = useEthereum()
  const { userAddress, isHomeChain } = eth

  const [isVoting, setIsVoting] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [hasCompleted, setHasCompleted] = useState(false)
  const [selectedChoice, setSelectedChoice] = useState<bigint | undefined>()
  const [existingVote, setExistingVote] = useState<bigint | undefined>(undefined)
  const [isDestroying, setIsDestroying] = useState(false)

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
    completeDemoPoll,
    voteCounts,
    winningChoice,
    pollResults,
    gaslessEnabled,
    gaslessPossible,
    gvAddresses,
    gvBalances,
    invalidateGaslessStatus,
    isMine,
    permissions,
    permissionsPending,
    checkPermissions,
    correctiveAction,
  } = useExtendedPoll(proposal, { onDashboard: false })

  const { now } = useTime()
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

  let canSelect = false
  let canVote = false

  if (designDecisions.showSubmitButton) {
    canSelect =
      !remainingTime?.isPastDue &&
      winningChoice === undefined &&
      (eth.state.address === undefined || existingVote === undefined) &&
      !isVoting

    canVote =
      (!!eth.state.address || isDemo) &&
      !isCompleting &&
      !isDestroying &&
      winningChoice === undefined &&
      selectedChoice !== undefined &&
      existingVote === undefined &&
      getVerdict(permissions.canVote, false)
  } else {
    canSelect =
      (!!eth.state.address || isDemo) &&
      !remainingTime?.isPastDue &&
      winningChoice === undefined &&
      // (eth.state.address === undefined || existingVote === undefined) &&
      !isCompleting &&
      !isDestroying &&
      winningChoice === undefined &&
      existingVote === undefined &&
      getVerdict(permissions.canVote, false) &&
      !isVoting
  }

  const hasWallet = isDemo || (isHomeChain && userAddress !== ZeroAddress)
  const hasWalletOnWrongNetwork = !isDemo && !isHomeChain && userAddress !== ZeroAddress

  const canComplete =
    proposal?.owner == userAddress && (!deadline || isPastDue) && (!isDestroying || !isCompleting)
  const canDestroy = proposal?.owner == userAddress && (!isDestroying || !isCompleting)

  // console.log("canAclManage?", canAclManage, "deadline:", deadline, "isPastDue?", isPastDue, "canComplete?", canComplete)

  const completePoll = async () => {
    if (!signerDao) throw new Error("Can't complete poll with no poll manager.")
    setIsCompleting(true)
    try {
      await doCompletePoll(eth, signerDao, proposalId)
      setHasCompleted(true)
    } catch (e) {
      console.log('Error completing poll:', e)
    } finally {
      setIsCompleting(false)
    }
  }

  const destroyPoll = async () => {
    if (!signerDao) throw new Error("Can't destroy poll with no poll manager.")
    setIsDestroying(true)
    try {
      await doDestroyPoll(eth, signerDao, proposalId)
      navigate('/')
    } catch (e) {
      console.log('Error destroying poll:', e)
    } finally {
      setIsDestroying(false)
    }
  }

  const moveDemoAfterVoting = useCallback(() => {
    const remainingSeconds = remainingTime?.totalSeconds
    if (
      !!deadline &&
      !!remainingSeconds &&
      remainingSeconds > demoSettings.jumpToSecondsBeforeCompletion + demoSettings.timeContractionSeconds
    ) {
      // Let's quickly get rid of the remaining time.
      tuneValue({
        startValue: deadline,
        transitionTime: demoSettings.timeContractionSeconds,
        endValue:
          Date.now() / 1000 +
          demoSettings.jumpToSecondsBeforeCompletion +
          demoSettings.timeContractionSeconds,
        stepInMs: 100,
        setValue: setDeadline,
        easing: true,
      })
    } else {
      if (!deadline) {
        console.log('Not speeding up time, since there is no deadline.')
      } else if (!remainingSeconds) {
        console.log('Not speeding up time, since there is are no remainingSeconds.')
      } else {
        const threshold = demoSettings.jumpToSecondsBeforeCompletion + demoSettings.timeContractionSeconds
        if (remainingSeconds <= threshold) {
          console.log(
            'Not speeding up time, since we would need at least',
            threshold,
            'seconds, but we have only',
            remainingSeconds,
          )
        } else {
          console.log('i have no idea why are we not speeding up the time.')
        }
      }
    }
  }, [deadline, remainingTime, setDeadline])

  const doVote = useCallback(
    async (choice: bigint | undefined): Promise<void> => {
      if (choice === undefined) throw new Error('no choice selected')

      if (isDemo) {
        return new Promise<void>((resolve, reject) => {
          setTimeout(() => {
            if (
              confirm(
                "Are you sure you want to submit your vote? (Normally you should see a MetaMask popup at this point, but this demo doesn't require any wallet, so this will have to do...)",
              )
            ) {
              setExistingVote(choice)
              setHasVoted(true)
              moveDemoAfterVoting()
              resolve()
            } else {
              reject()
            }
          }, 1000)
        })
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
          permissions.proof,
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
          let tx_hash = ''
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
        await eth.switchNetwork(ConfiguredNetwork)
        const tx = await signerDao.vote(proposalId, choice, permissions.proof)
        const receipt = await tx.wait()

        if (receipt!.status != 1) throw new Error('cast vote tx failed')
      }

      setExistingVote(choice)
      setHasVoted(true)
    },
    [
      selectedChoice,
      gaslessVoting,
      signerDao,
      gaslessPossible,
      eth.state.signer,
      eth.state.provider,
      gvAddresses,
      permissions.proof,
      moveDemoAfterVoting,
    ],
  )

  async function vote(choice?: bigint): Promise<boolean> {
    try {
      setIsVoting(true)
      await doVote(choice ?? selectedChoice)
      setIsVoting(false)
      return true
    } catch (e) {
      let errorString = `${e}`
      if (errorString.startsWith('Error: user rejected action')) {
        errorString = 'The signer refused to sign this vote.'
      }
      window.alert(`Failed to submit vote: ${errorString}`)
      console.log(e)
      setIsVoting(false)
      return false
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
    // Complete the demo time if nothing more is going to happen
    () => {
      if (
        isDemo &&
        isPollActive(poll?.proposal.params) &&
        remainingTime?.isPastDue &&
        remainingTime.totalSeconds < demoSettings.waitSecondsBeforeFormallyCompleting + 5 &&
        remainingTime.totalSeconds >= demoSettings.waitSecondsBeforeFormallyCompleting
      ) {
        completeDemoPoll()
      }
    },
    [deadline, now],
  )

  // if (!isDemo && userAddress === "0x0000000000000000000000000000000000000000") {

  useEffect(() => {
    // Reload poll after completion, expecting results
    if (hasCompleted) {
      if (!poll) {
        // console.log("No poll loaded, waiting to load")
      } else if (isPollActive(poll.proposal.params)) {
        // console.log("Apparently, we have completed a poll, but we still perceive it as active, so scheduling a reload...")
        setTimeout(() => {
          // console.log("Reloading now")
          invalidateProposal()
        }, 5 * 1000)
      } else {
        // console.log("We no longer perceive it as active, so we can stop reloading")
        setHasCompleted(false)
      }
    }
  }, [hasCompleted, poll])

  return {
    userAddress,
    hasWallet,
    hasWalletOnWrongNetwork,
    isLoading: isProposalLoading || isLoading,
    error: proposalError ?? error,
    poll,
    active: isPollActive(poll?.proposal?.params),

    selectedChoice: winningChoice ?? selectedChoice,
    canSelect,
    setSelectedChoice: async (value: bigint | undefined) => {
      if (designDecisions.showSubmitButton) {
        setSelectedChoice(value)
      } else {
        setSelectedChoice(value)
        if (value !== undefined) {
          if (!(await vote(value))) setSelectedChoice(undefined)
        }
      }
    },
    remainingTime,
    remainingTimeString,

    isMine,
    permissions,
    permissionsPending,
    checkPermissions,
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

    canComplete,
    completePoll,
    isCompleting,
    hasCompleted,
    canDestroy,
    destroyPoll,
    isDestroying,

    voteCounts,
    winningChoice,
    pollResults,
    correctiveAction,
  }
}

export type PollData = ReturnType<typeof usePollData>
