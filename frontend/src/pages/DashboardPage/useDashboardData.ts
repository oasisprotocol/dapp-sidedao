import { useContracts } from '../../hooks/useContracts'
import { useEffect, useMemo, useState } from 'react'
import { PollManager, Proposal } from '../../types'
import { useEthereum } from '../../hooks/useEthereum'
import { useBooleanField, useOneOfField, useTextField } from '../../components/InputFields'
import { useNavigate } from 'react-router-dom'
import { dashboard, designDecisions } from '../../constants/config'
import classes from './index.module.css'

const FETCH_BATCH_SIZE = 100

type RawProposal = PollManager.ProposalWithIdStructOutput

interface FetchProposalResult {
  out_count: bigint
  out_proposals: RawProposal[]
}

const ownership = new Map<string, boolean>()

const matchingCards = new Map<string, Set<string>>()

const searchPatternsToKey = (searchPatterns: string[]) => searchPatterns.join('--')

const registerMatch = (searchPatterns: string[], pollId: string) => {
  const key = searchPatternsToKey(searchPatterns)
  let currentBucket: Set<string> | undefined = matchingCards.get(key)
  if (!currentBucket) {
    currentBucket = new Set<string>()
    matchingCards.set(key, currentBucket)
  }
  currentBucket.add(pollId)
}

async function fetchProposals(
  fetcher: (offset: number, batchSize: number) => Promise<FetchProposalResult>,
): Promise<Proposal[]> {
  const proposalList: Proposal[] = []

  for (let offset = 0; ; offset += FETCH_BATCH_SIZE) {
    let result: FetchProposalResult
    try {
      result = await fetcher(offset, FETCH_BATCH_SIZE)
    } catch (e: any) {
      console.error('failed to fetch proposals', e)
      break
    }

    result.out_proposals.forEach(({ id, proposal }) => {
      const [active, topChoice, params] = proposal
      proposalList.push({ id, active, topChoice, params })
    })

    if (result.out_proposals.length < FETCH_BATCH_SIZE) {
      return proposalList
    }
  }

  return proposalList
}

export const useDashboardData = () => {
  const eth = useEthereum()
  const { pollManager: dao, pollManagerAddress: daoAddress, pollManagerACL } = useContracts(eth)

  const { userAddress } = eth

  const [activeProposals, setActiveProposals] = useState<Proposal[]>([])
  const [pastProposals, setPastProposals] = useState<Proposal[]>([])
  const [canCreatePoll, setCanCreatePoll] = useState(false)
  const [isLoadingActive, setIsLoadingActive] = useState(true)
  const [isLoadingPast, setIsLoadingPast] = useState(true)
  const [allProposals, setAllProposals] = useState<Proposal[]>([])

  useEffect(() => {
    if (!dao) {
      setActiveProposals([])
      setPastProposals([])
      return
    }
    void fetchAllProposals()
  }, [dao])

  useEffect(() => {
    if (!pollManagerACL || !userAddress || !daoAddress) {
      setCanCreatePoll(false)
      return
    }
    // console.log("Checking canCreatePol...")
    pollManagerACL.canCreatePoll(daoAddress, userAddress).then(canCreate => {
      // console.log("...canCreate?", canCreate)
      setCanCreatePoll(canCreate)
    })
  }, [pollManagerACL, userAddress, daoAddress])

  const fetchAllProposals = async () => {
    // console.log("Fetching all polls...")

    if (!dao) {
      console.log('No DAO, no fetching...')
    }

    const { number: blockTag } = (await eth.state.provider.getBlock('latest'))!

    await Promise.all([
      fetchProposals((offset, batchSize) => dao!.getActiveProposals(offset, batchSize)).then(proposals => {
        setActiveProposals(proposals)
        setIsLoadingActive(false)
      }),
      fetchProposals((offset, batchSize) => dao!.getPastProposals(offset, batchSize, { blockTag })).then(
        proposals => {
          setPastProposals(proposals)
          setIsLoadingPast(false)
        },
      ),
    ])
  }

  useEffect(() => {
    const all: Proposal[] = []

    activeProposals.forEach(proposal => {
      all.push({
        ...proposal,
        active: true,
      })
    })

    pastProposals.forEach(proposal => {
      all.push({
        ...proposal,
        active: false,
      })
    })
    setAllProposals(all)
  }, [activeProposals, pastProposals, userAddress])

  const [version, setVersion] = useState(0)

  const registerOwnership = (pollId: string, mine: boolean) => {
    if (!ownership.has(pollId) || ownership.get(pollId) !== mine) {
      ownership.set(pollId, mine)
      setVersion(version + 1)
    }
  }

  const showInaccessible = useBooleanField({
    name: 'showInaccessible',
    label: "Show polls I don't have access to",
    initialValue: false,
  })

  const wantedPollType = useOneOfField({
    name: 'wantedPollType',
    choices: [
      { value: 'openOnly', label: 'Open polls' },
      { value: 'completedOnly', label: 'Completed polls' },
      { value: 'all', label: 'Both open and completed polls' },
    ],
    initialValue: 'all',
  } as const)

  const navigate = useNavigate()

  const pollSearchPatternInput = useTextField({
    name: 'pollSearchPattern',
    placeholder: 'Start typing here to search for poll',
    autoFocus: true,
    containerClassName: classes.search,
    onEnter: () => {
      const key = searchPatternsToKey(searchPatterns)
      const cards = matchingCards.get(key)
      if (!cards) return // No matching cards registered
      if (cards.size > 1) return // Too many matching cards
      const pollId = Array.from(cards.values())[0]
      navigate(`/polls/${pollId}`)
    },
  })

  const searchPatterns = useMemo(() => {
    const patterns = pollSearchPatternInput.value
      .trim()
      .split(' ')
      .filter(p => p.length)
    if (patterns.length === 1 && patterns[0].length < 2) {
      return []
    } else {
      return patterns
    }
  }, [pollSearchPatternInput.value])

  const [myProposals, setMyProposals] = useState<Proposal[]>([])
  const [otherProposals, setOtherProposals] = useState<Proposal[]>([])

  const typeFilters: Record<typeof wantedPollType.value, (proposal: Proposal) => boolean> = useMemo(
    () => ({
      openOnly: proposal => proposal.active,
      completedOnly: proposal => !proposal.active,
      all: () => true,
    }),
    [],
  )

  const typeFilter = typeFilters[wantedPollType.value]

  useEffect(() => {
    // console.log('Updating lists')
    const newMine: Proposal[] = []
    const newOthers: Proposal[] = []
    allProposals.filter(typeFilter).forEach(proposal => {
      const isThisMine = ownership.get(proposal.id)
      if (isThisMine) {
        newMine.push(proposal)
      } else {
        newOthers.push(proposal)
      }
    })
    setMyProposals(newMine)
    setOtherProposals(newOthers)
    // console.log('Found:', newMine.length, newOthers.length, 'out of', allProposals.length)
  }, [version, allProposals, typeFilter])

  const filterInputs = useMemo(() => {
    return [
      wantedPollType,
      ...(dashboard.showPermissions && designDecisions.showInaccessiblePollCheckbox
        ? [showInaccessible]
        : []),
    ]
  }, [dashboard.showPermissions, wantedPollType.value, showInaccessible.value])

  return {
    userAddress,
    canCreatePoll,
    isLoadingPolls: isLoadingActive || isLoadingPast,
    myProposals,
    otherProposals,
    registerOwnership,
    registerMatch,
    filterInputs,
    shouldShowInaccessiblePolls: !dashboard.showPermissions || showInaccessible.value,
    pollSearchPatternInput,
    searchPatterns,
  }
}
