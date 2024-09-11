import { useProposalFromChain } from './useProposalFromChain'
import { ListOfVotes, ExtendedPoll, Poll, PollResults } from '../types'
import { useEffect, useMemo, useState } from 'react'
import { useIPFSData } from './useIPFSData'
import { getBytes } from 'ethers'
import { decryptJSON } from '../utils/crypto.demo'
import { demoSettings, getDemoPoll } from '../constants/config'
import { useTime } from './useTime'
import { usePollGaslessStatus } from './usePollGaslessStatus'
import { usePollPermissions } from './usePollPermissions'

const noVotes: ListOfVotes = { out_count: 0n, out_voters: [], out_choices: [] }

export const usePoll = (
  pollId: string,
  params: {
    withResults?: boolean
  } = {},
) => {
  const { withResults = false } = params

  const proposalId = `0x${pollId}`
  const isDemo = pollId === 'demo'
  const [poll, setPoll] = useState<ExtendedPoll | undefined>()
  const [deadline, setDeadline] = useState<number | undefined>()
  const [voteCounts, setVoteCounts] = useState<bigint[]>([])
  const [winningChoice, setWinningChoice] = useState<bigint | undefined>(undefined)
  const [votes, setVotes] = useState<ListOfVotes>({ ...noVotes })

  const { now } = useTime(!!deadline)

  const {
    pollManager,
    isLoading: isProposalLoading,
    error: proposalError,
    invalidateProposal,
    proposal,
  } = useProposalFromChain(proposalId)

  const { gaslessEnabled, gaslessPossible, gvAddresses, gvBalances, invalidateGaslessStatus } =
    usePollGaslessStatus(proposalId)

  const {
    isLoading: isIpfsLoading,
    error: ipfsError,
    data: ipfsData,
  } = useIPFSData(proposal?.params?.ipfsHash)

  const ipfsParams = useMemo(
    () =>
      proposal && ipfsData
        ? (decryptJSON(getBytes(proposal.params.ipfsSecret), ipfsData) as Poll)
        : undefined,
    [ipfsData, proposal?.params?.ipfsSecret],
  )

  useEffect(
    // Update poll object
    () => {
      setVoteCounts([])
      setWinningChoice(undefined)
      setVotes({ ...noVotes })
      if (isDemo) {
        setPoll(getDemoPoll())
        setDeadline(now + demoSettings.timeForVoting)
        return
      }
      if (proposal && ipfsParams) {
        setPoll({
          id: pollId,
          proposal,
          ipfsParams,
        })
        setDeadline(ipfsParams.options.closeTimestamp)
      } else {
        setPoll(undefined)
      }
    },
    [proposal, ipfsParams, isDemo],
  )

  const { canAclVote, aclExplanation, aclProof, canAclManage } = usePollPermissions(poll)

  const loadVotes = async () => {
    if (isDemo || !proposal || !pollManager || !ipfsParams || !withResults || proposal.active) return
    const voteCounts = (await pollManager.getVoteCounts(proposalId)).slice(0, ipfsParams.choices.length)
    setVoteCounts(voteCounts)
    setWinningChoice(proposal.topChoice)

    if (proposal.params.publishVotes) {
      setVotes(await pollManager.getVotes(proposalId, 0, 10))
    } else {
      setVotes({ ...noVotes })
    }
  }

  useEffect(
    // Load votes, when the stars are right
    () => void loadVotes(),
    [proposal, proposal?.active, withResults, pollManager, ipfsParams, isDemo],
  )

  const pollResults = useMemo(() => {
    if (!poll) return
    const results: PollResults = {
      totalVotes: voteCounts.reduce((a, b) => a + b, 0n),
      choices: {},
      winner: poll.proposal.topChoice?.toString(),
      votes,
    }
    const zeroVotes = !results.totalVotes
    poll.ipfsParams.choices.forEach((choice, index) => {
      results.choices[index.toString()] = {
        choice,
        votes: voteCounts[index],
        rate: zeroVotes ? 0 : Math.round(Number((1000n * voteCounts[index]) / results.totalVotes) / 10),
        winner: index.toString() === winningChoice?.toString(),
      }
    })
    return results
  }, [poll, voteCounts, winningChoice, votes])

  const closeDemoPoll = () => {
    if (!poll) return
    // Let's formally close the poll
    setPoll({
      ...poll,
      proposal: {
        ...poll.proposal,
        active: false,
        topChoice: 0n,
      },
    })

    // Get some random vote numbers
    const voteNumbers = poll.ipfsParams.choices.map(() => Math.round(Math.random() * 100))
    const voteBigInts = voteNumbers.map(BigInt)
    // Let's pick a winner
    const winningIndexNumber = voteNumbers.indexOf(Math.max(...voteNumbers))
    const winningIndexBigInt = BigInt(winningIndexNumber)
    // Simulate loading the results
    setTimeout(() => {
      setVoteCounts(voteBigInts)
      setWinningChoice(winningIndexBigInt)
    }, 1000)
  }

  return {
    proposalId,
    isDemo,
    isLoading: isProposalLoading || isIpfsLoading,
    error: proposalError ?? ipfsError,
    poll,
    voteCounts,
    winningChoice,
    votes,
    pollResults,
    deadline,
    setDeadline,
    invalidatePoll: invalidateProposal,
    closeDemoPoll,
    gaslessEnabled,
    gaslessPossible,
    gvAddresses,
    gvBalances,
    invalidateGaslessStatus,
    canAclVote,
    aclExplanation,
    aclProof,
    canAclManage,
  }
}
