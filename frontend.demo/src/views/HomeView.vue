<script setup lang="ts">
import { ethers, getBytes } from 'ethers';
import { onMounted, ref, shallowRef } from 'vue';

import type { PollManager, Poll } from '@oasisprotocol/side-dao-contracts';
import { usePollManager, usePollManagerACL } from '../contracts';
import { useEthereumStore } from '../stores/ethereum';
import AppButton from '@/components/AppButton.vue';
import AppPoll from '@/components/AppPoll.vue';
import PollLoader from '@/components/PollLoader.vue';
import { Pinata, decryptJSON } from '@/utils';

const eth = useEthereumStore();
const dao = usePollManager();

const FETCH_BATCH_SIZE = 100;

type FullProposal = PollManager.ProposalWithIdStructOutput & { params: Poll } & { empty: Boolean };
const activePolls = shallowRef<Record<string, FullProposal>>({});
const pastPolls = shallowRef<Record<string, FullProposal>>({});
const canCreatePoll = ref<Boolean>(false);
const isLoadingActive = ref<Boolean>(true);
const isLoadingPast = ref<Boolean>(true);

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

onMounted(async () => {
  const acl = await usePollManagerACL();
  const userAddress = eth.signer ? await eth.signer.getAddress() : ethers.ZeroAddress;
  canCreatePoll.value = await acl.value.canCreatePoll(await dao.value.getAddress(), userAddress);

  const { number: blockTag } = (await eth.provider.getBlock('latest'))!;

  await Promise.all([
    fetchProposals((offset, batchSize) => dao.value.getActiveProposals(offset, batchSize)).then(
      (proposalsMap) => {
        activePolls.value = { ...proposalsMap };
        isLoadingActive.value = false;
      },
    ),
    fetchProposals((offset, batchSize) => {
      return dao.value.getPastProposals(offset, batchSize, {
        blockTag,
      });
    }).then(async (proposalsMap) => {
      pastPolls.value = { ...proposalsMap };
      // Filter polls without votes
      await Promise.all(
        Object.keys(pastPolls.value).map(async (proposalId) => {
          const voteCount: bigint[] = await dao.value.getVoteCounts('0x' + proposalId);
          if (voteCount[Number(pastPolls.value[proposalId].proposal.topChoice)] === 0n) {
            pastPolls.value[proposalId].empty = true;
          }
        }),
      );
      isLoadingPast.value = false;
    }),
  ]);
});
</script>

<template>
  <section class="pt-5">
    <div v-if="canCreatePoll" class="flex justify-center mb-6">
      <RouterLink to="polls">
        <AppButton variant="secondary">&plus;&nbsp;&nbsp;Create a new poll</AppButton>
      </RouterLink>
    </div>

    <h2 class="capitalize text-white text-2xl font-bold mb-6">Active Polls</h2>

    <div v-if="!isLoadingActive">
      <AppPoll
        v-for="[pollId, poll] in Object.entries(activePolls)"
        :key="pollId"
        :poll-id="pollId"
        :name="poll.params.name"
        :description="poll.params.description"
        :creator-address="poll.params.creator"
        active
      />
    </div>
    <div v-else>
      <PollLoader />
      <PollLoader />
      <PollLoader />
    </div>

    <p
      v-if="!isLoadingActive && Object.keys(activePolls).length <= 0"
      class="text-white text-center mb-6 font-normal"
    >
      There are no active polls
    </p>

    <h2 class="capitalize text-white text-2xl font-bold mb-6">Past Polls</h2>

    <div v-if="!isLoadingPast">
      <AppPoll
        v-for="[pollId, poll] in Object.entries(pastPolls)"
        :key="pollId"
        :poll-id="pollId"
        :name="poll.params.name"
        :description="poll.params.description"
        :creator-address="poll.params.creator"
        :choices="poll.params.choices"
        :outcome="!poll.empty ? Number(poll.proposal.topChoice) : undefined"
      />
    </div>
    <div v-else>
      <PollLoader />
      <PollLoader />
      <PollLoader />
    </div>

    <p
      v-if="!isLoadingPast && Object.keys(pastPolls).length <= 0"
      class="text-white text-center font-normal"
    >
      There are no past polls
    </p>
  </section>
</template>

<style scoped lang="postcss">
form {
  @apply text-center;
}

input {
  @apply block my-4 p-1 mx-auto text-3xl text-center border border-gray-400 rounded-xl;
}

h2 {
  @apply font-bold text-2xl my-2;
}
</style>
