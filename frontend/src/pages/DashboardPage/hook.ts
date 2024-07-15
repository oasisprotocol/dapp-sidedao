import { Pinata } from '../../utils/Pinata';
import { decryptJSON } from '../../utils/crypto.demo';
import { getBytes } from 'ethers';
import { useContracts  } from '../../hooks/useContracts';
import { useEffect, useState } from 'react';
import { FullProposal, PollManager } from '../../types';
import { useEthereum } from '../../hooks/useEthereum';

const FETCH_BATCH_SIZE = 100;

interface FetchProposalResult {
  out_count: bigint;
  out_proposals: PollManager.ProposalWithIdStructOutput[];
}

async function fetchProposals(
  fetcher: (offset: number, batchSize: number) => Promise<FetchProposalResult>,
): Promise<Record<string, FullProposal>> {
  const proposalsMap: Record<string, FullProposal> = {};

  for (let offset = 0; ; offset += FETCH_BATCH_SIZE) {
    let result: FetchProposalResult;
    try {
      result = await fetcher(offset, FETCH_BATCH_SIZE);
    } catch (e: any) {
      console.error('failed to fetch proposals', e);
      break;
    }
    await Promise.all(
      result.out_proposals.map(async ({ id, proposal }) => {
        const ipfsHash = proposal.params.ipfsHash;
        id = id.slice(2);

        try {
          const params = decryptJSON(
            getBytes(proposal.params.ipfsSecret),
            await Pinata.fetchData(ipfsHash),
          );
          proposalsMap[id] = { id, params, proposal } as FullProposal;
        } catch (e) {
          return console.error('failed to fetch proposal params from IPFS', e);
        }
      }),
    );

    if (result.out_proposals.length < FETCH_BATCH_SIZE) {
      return proposalsMap;
    }
  }

  return proposalsMap;
}

export const useDashboardData = () => {
  const eth = useEthereum();
  const {
    pollManager: dao,
    pollManagerAddress: daoAddress,
    pollManagerACL
  } = useContracts(eth)

  const { userAddress } = eth


  const [activePolls, setActivePolls] = useState<Record<string, FullProposal>>({});
  const [pastPolls, setPastPolls] = useState<Record<string, FullProposal>>({});
  const [canCreatePoll, setCanCreatePoll] = useState(false)
  const [isLoadingActive, setIsLoadingActive] = useState(true);
  const [isLoadingPast, setIsLoadingPast] = useState(true);
  const [myPolls, setMyPolls] = useState<FullProposal[]>([]);
  const [otherPolls, setOtherPolls] = useState<FullProposal[]>([]);

  useEffect(() => {
    if (!dao) {
      setActivePolls({})
      setPastPolls({})
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
    }, [pollManagerACL, userAddress, daoAddress]
  );

  const fetchAllProposals = async () => {
    // console.log("Fetching all polls...")

    if (!dao) {
      console.log("No DAO, no fetching...")
    }

    const { number: blockTag } = (await eth.state.provider.getBlock('latest'))!;

    await Promise.all([
      fetchProposals((offset, batchSize) => dao!.getActiveProposals(offset, batchSize)).then(
        (proposalsMap) => {
          setActivePolls( { ...proposalsMap });
          setIsLoadingActive(false);
        },
      ),
      fetchProposals((offset, batchSize) => {
        return dao!.getPastProposals(offset, batchSize, {
          blockTag,
        });
      }).then(async (proposalsMap) => {
        setPastPolls( { ...proposalsMap });
        // Filter polls without votes
        await Promise.all(
          Object.keys(pastPolls).map(async (proposalId) => {
            const voteCount: bigint[] = await dao!.getVoteCounts('0x' + proposalId);
            if (voteCount[Number(pastPolls[proposalId].proposal.topChoice)] === 0n) {
              pastPolls[proposalId].empty = true;
            }
          }),
        );
        setIsLoadingPast(false);
      }),
    ]);
  }

  useEffect(() => {
    const mine: FullProposal[] = [];
    const others: FullProposal[] = [];

    Object.entries(activePolls).forEach(([pollId, poll])=>{
      const list = (poll.params.creator.toLowerCase() === userAddress?.toLowerCase()) ? mine : others
      list.push({
        ...poll,
        id: pollId,
        proposal: {
          ...poll.proposal,
          active: true,
        }
      })
    })
    Object.entries(pastPolls).forEach(([pollId, poll])=>{
      const list = (poll.params.creator.toLowerCase() === userAddress?.toLowerCase()) ? mine : others
      list.push({
        ...poll,
        id: pollId,
        proposal: {
          ...poll.proposal,
          active: false,
        }
      })
    })
    setMyPolls(mine)
    setOtherPolls(others)

  }, [activePolls, pastPolls, userAddress]);

  const isLoadingPolls = isLoadingActive || isLoadingPast

  return {
    userAddress,
    canCreatePoll,
    isLoadingActive,
    isLoadingPast,
    activePolls,
    pastPolls,
    isLoadingPolls,
    myPolls,
    otherPolls,
    fetchAllProposals,
  }
}
