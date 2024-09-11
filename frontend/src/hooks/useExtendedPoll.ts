import { ListOfVotes, ExtendedPoll, Poll, PollResults, Proposal } from '../types'
import { useEffect, useMemo, useState } from 'react'
import { useIPFSData } from './useIPFSData'
import { getBytes } from 'ethers'
import { decryptJSON } from '../utils/crypto.demo'
import { demoSettings, getDemoPoll } from '../constants/config'
import { useTime } from './useTime'
import { usePollGaslessStatus } from './usePollGaslessStatus'
import { usePollPermissions } from './usePollPermissions'
import { useEthereum } from './useEthereum'
import { useContracts } from './useContracts'

const noVotes: ListOfVotes = { out_count: 0n, out_voters: [], out_choices: [] }

export const useExtendedPoll = (
  proposal: Proposal | undefined,
  params: {
    withResults?: boolean
  } = {},
) => {
  const eth = useEthereum()
  const { userAddress } = eth
  const { pollManager } = useContracts(eth)
  const { withResults = false } = params

  const proposalId = proposal?.id
  const isDemo = proposalId === '0xdemo'
  const [poll, setPoll] = useState<ExtendedPoll | undefined>()
  const [deadline, setDeadline] = useState<number | undefined>()
  const [voteCounts, setVoteCounts] = useState<bigint[]>([])
  const [winningChoice, setWinningChoice] = useState<bigint | undefined>(undefined)
  const [votes, setVotes] = useState<ListOfVotes>({ ...noVotes })

  const { now } = useTime(!!deadline)

  const { gaslessEnabled, gaslessPossible, gvAddresses, gvBalances, invalidateGaslessStatus } =
    usePollGaslessStatus(proposalId)

  const ipfsHash = proposal?.params?.ipfsHash

  const { isLoading: isIpfsLoading, error: ipfsError, data: ipfsData } = useIPFSData(ipfsHash)

  const ipfsSecret = proposal?.params?.ipfsSecret

  const ipfsParams = useMemo(
    () => (ipfsSecret && ipfsData ? (decryptJSON(getBytes(ipfsSecret), ipfsData) as Poll) : undefined),
    [ipfsData, ipfsSecret],
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
          id: proposal.id.substring(2),
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
    const voteCounts = (await pollManager.getVoteCounts(proposal.id)).slice(0, ipfsParams.choices.length)
    setVoteCounts(voteCounts)
    setWinningChoice(proposal.topChoice)

    if (proposal.params.publishVotes) {
      setVotes(await pollManager.getVotes(proposal.id, 0, 10))
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

  const creator = poll?.ipfsParams.creator

  const isMine = useMemo(() => {
    if (isDemo) return false
    if (!creator || !userAddress) return undefined
    return creator.toLowerCase() === userAddress.toLowerCase()
  }, [isDemo, creator, userAddress])

  return {
    proposalId,
    isDemo,
    isLoading: isIpfsLoading,
    error: ipfsError,
    poll,
    voteCounts,
    winningChoice,
    votes,
    pollResults,
    deadline,
    setDeadline,
    closeDemoPoll,
    gaslessEnabled,
    gaslessPossible,
    gvAddresses,
    gvBalances,
    invalidateGaslessStatus,
    canAclVote,
    aclExplanation,
    aclProof,
    isMine,
    canAclManage,
  }
}
