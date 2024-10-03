import { ListOfVotes, ExtendedPoll, PollResults, Proposal, ListOfVoters } from '../types'
import { useEffect, useMemo, useState } from 'react'
import { dashboard, demoSettings, getDemoPoll } from '../constants/config'
import { usePollGaslessStatus } from './usePollGaslessStatus'
import { usePollPermissions } from './usePollPermissions'
import { useEthereum } from './useEthereum'
import { useContracts } from './useContracts'
import { decodeBase64, toUtf8String } from 'ethers'
import { getVerdict } from '../components/InputFields'

const noVoters: ListOfVoters = { out_count: 0n, out_voters: [] }
const noVotes: ListOfVotes = { ...noVoters, out_choices: [] }

export const useExtendedPoll = (
  proposal: Proposal | undefined,
  params: {
    onDashboard: boolean
  },
) => {
  const eth = useEthereum()
  const { pollManager } = useContracts(eth)

  const proposalId = proposal?.id
  const isDemo = proposalId === '0xdemo'
  const [poll, setPoll] = useState<ExtendedPoll | undefined>()
  const [deadline, setDeadline] = useState<number | undefined>()
  const [voteCounts, setVoteCounts] = useState<bigint[]>([])
  const [winningChoice, setWinningChoice] = useState<bigint | undefined>(undefined)
  const [votes, setVotes] = useState<ListOfVotes>({ ...noVotes })
  const [voters, setVoters] = useState<ListOfVoters>({ ...noVotes })

  const { gaslessEnabled, gaslessPossible, gvAddresses, gvBalances, invalidateGaslessStatus } =
    usePollGaslessStatus(proposalId, params.onDashboard)

  const metadata = proposal?.params?.metadata

  let correctiveAction: (() => void) | undefined

  const ipfsParams = useMemo(
    () => (metadata ? JSON.parse(toUtf8String(decodeBase64(metadata))) : undefined),
    [metadata],
  )

  useEffect(
    // Update poll object
    () => {
      setVoteCounts([])
      setWinningChoice(undefined)
      setVotes({ ...noVotes })
      if (isDemo) {
        setPoll(getDemoPoll())
        setDeadline(Math.round(Date.now() / 1000) + demoSettings.timeForVoting)
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

  const {
    isMine,
    permissions,
    checkPermissions,
    isPending: permissionsPending,
  } = usePollPermissions(poll, params.onDashboard)

  if (!permissionsPending && !getVerdict(permissions?.canVote, false)) {
    correctiveAction = checkPermissions
  }

  const isActive = !!proposal?.active

  const loadVotes = async () => {
    if (isDemo || !proposal || !pollManager || !ipfsParams || proposal.active) return

    if (params.onDashboard && !dashboard.showResults) return

    console.log('Loading results for', proposalId)

    const voteCounts = (await pollManager.getVoteCounts(proposal.id)).slice(0, ipfsParams.choices.length)
    setVoteCounts(voteCounts)
    setWinningChoice(proposal.topChoice)

    if (proposal.params.publishVotes) {
      const loadedVotes: ListOfVotes = {
        out_count: 1000n, // Fake number, will be updated when the first batch is loaded
        out_voters: [],
        out_choices: [],
      }
      while (loadedVotes.out_voters.length < loadedVotes.out_count) {
        const newVotes = await pollManager.getVotes(proposal.id, loadedVotes.out_voters.length, 100)
        loadedVotes.out_count = newVotes.out_count
        loadedVotes.out_voters.push(...newVotes.out_voters)
        loadedVotes.out_choices.push(...newVotes.out_choices)
      }
      setVotes(loadedVotes)
    } else if (proposal.params.publishVoters) {
      const loadedVoters: ListOfVoters = {
        out_count: 1000n, // Fake number, will be updated when the first batch is loaded
        out_voters: [],
      }
      while (loadedVoters.out_voters.length < loadedVoters.out_count) {
        const newVoters = await pollManager.getVoters(proposal.id, loadedVoters.out_voters.length, 100)
        loadedVoters.out_count = newVoters.out_count
        loadedVoters.out_voters.push(...newVoters.out_voters)
      }
      setVotes({ ...noVotes })
      setVoters(loadedVoters)
    } else {
      setVotes({ ...noVotes })
      setVoters({ ...noVoters })
    }
  }

  useEffect(
    // Load votes, when the stars are right
    () => void loadVotes(),
    [proposal, proposal?.active, params.onDashboard, dashboard.showResults, pollManager, ipfsParams, isDemo],
  )

  const pollResults = useMemo(() => {
    if (!poll) return
    const results: PollResults = {
      totalVotes: voteCounts.reduce((a, b) => a + b, 0n),
      choices: {},
      winner: poll.proposal.topChoice?.toString(),
      votes,
      voters,
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
  }, [poll, voteCounts, winningChoice, votes, voters])

  const completeDemoPoll = () => {
    if (!poll) return
    // Let's formally complete the poll
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
    isActive,
    isDemo,
    isLoading: false,
    error: undefined,
    correctiveAction,
    poll,
    voteCounts,
    winningChoice,
    pollResults,
    deadline,
    setDeadline,
    completeDemoPoll,
    gaslessEnabled,
    gaslessPossible,
    gvAddresses,
    gvBalances,
    invalidateGaslessStatus,
    isMine,
    permissions,
    permissionsPending,
    checkPermissions,
  }
}
