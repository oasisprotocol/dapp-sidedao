import { useContracts } from '../../hooks/useContracts'
import { useEffect, useState } from 'react'
import { PollManager, Proposal } from '../../types'
import { useEthereum } from '../../hooks/useEthereum'

const FETCH_BATCH_SIZE = 100

type RawProposal = PollManager.ProposalWithIdStructOutput

interface FetchProposalResult {
  out_count: bigint
  out_proposals: RawProposal[]
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

  return {
    userAddress,
    canCreatePoll,
    isLoadingPolls: isLoadingActive || isLoadingPast,
    allProposals,
  }
}
