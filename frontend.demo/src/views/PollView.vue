<script setup lang="ts">
import {
  ZeroAddress,
  ethers,
  formatEther,
  getBytes,
  TransactionReceipt,
  parseEther,
  JsonRpcProvider,
  BytesLike,
  Transaction,
} from 'ethers';
import { computed, onMounted, ref, toValue } from 'vue';

import {micromark} from 'micromark';
import {
  IPollACL__factory,
  xchainRPC,
  fetchStorageProof,
  tokenDetailsFromProvider,
} from '@oasisprotocol/demo-voting-contracts';
import type {
  PollManager,
  Poll,
  AclOptionsXchain,
  TokenInfo,
} from '@oasisprotocol/demo-voting-contracts';
import { usePollManager, useGaslessVoting, usePollManagerWithSigner } from '../contracts';
import { Network, useEthereumStore } from '../stores/ethereum';

import AppButton from '@/components/AppButton.vue';
import AppBadge from '@/components/AppBadge.vue';
import CheckedIcon from '@/components/CheckedIcon.vue';
import UncheckedIcon from '@/components/UncheckedIcon.vue';
import SuccessInfo from '@/components/SuccessInfo.vue';
import CheckIcon from '@/components/CheckIcon.vue';
import PollDetailsLoader from '@/components/PollDetailsLoader.vue';

import { Pinata, decryptJSON, abbrAddr, randomchoice } from '@/utils';
import { useRouter } from 'vue-router';

const props = defineProps<{ id: string }>();
const proposalId = `0x${props.id}`;

const router = useRouter();
const dao = usePollManager();
const eth = useEthereumStore();
const gaslessVoting = useGaslessVoting();

type GetVotesReturnT = {
  out_count: bigint;
  out_voters: string[];
  out_choices: PollManager.ChoiceStructOutput[];
};

const error = ref('');
const isLoading = ref(false);
const hasVoted = ref(false);
const isClosing = ref(false);
const isClosed = ref(false);
const poll = ref<PollManager.ProposalWithIdStructOutput & { ipfsParams: Poll }>();
const winningChoice = ref<bigint | undefined>(undefined);
const selectedChoice = ref<bigint | undefined>();
const existingVote = ref<bigint | undefined>(undefined);
const voteCounts = ref<bigint[]>([]);
const votes = ref<GetVotesReturnT>({ out_count: 0n, out_voters: [], out_choices: [] });
let canClosePoll = ref<Boolean>(false);
let canAclVote = ref<Boolean>(false);
const gvAddrs = ref<string[]>([]);
const gvBalances = ref<bigint[]>();
const gvTotalBalance = ref<bigint>(0n);

const isTokenHolderACL = ref<boolean>(false);
const aclTokenInfo = ref<TokenInfo>();

const isXChainACL = ref<boolean>(false);
const xchainOptions = ref<AclOptionsXchain | undefined>();
const aclProof = ref<BytesLike>('');
const isWhitelistACL = ref<boolean>(false);

const canVote = computed(() => {
  if (!eth.address) return false;
  if (winningChoice.value !== undefined) return false;
  if (selectedChoice.value === undefined) return false;
  if (existingVote.value !== undefined) return false;
  return canAclVote.value != false;
});

const canSelect = computed(() => {
  if (winningChoice.value !== undefined) return false;
  if (eth.address === undefined) return true;
  return existingVote.value === undefined;
});

async function closeBallot(): Promise<void> {
  await eth.switchNetwork(); // ensure we're on the correct network first!
  const signerDao = usePollManagerWithSigner();
  const tx = await signerDao.close(proposalId);
  console.log('Close proposal tx', tx);
  isClosing.value = true;
  try {
    const receipt = await tx.wait();

    if (receipt!.status != 1) throw new Error('close ballot tx failed');
    else {
      isClosed.value = true;
    }
  } catch (e) {
    console.log(e);
  } finally {
    isClosing.value = false;
  }
}

async function vote(e: Event): Promise<void> {
  e.preventDefault();
  try {
    error.value = '';
    isLoading.value = true;
    await doVote();
    hasVoted.value = true;
    //} catch (e: any) {
    //  error.value = e.reason ?? e.message;
  } finally {
    isLoading.value = false;
  }
}

async function doVote(): Promise<void> {
  if (selectedChoice.value === undefined) throw new Error('no choice selected');

  const choice = selectedChoice.value;

  const gv = (await gaslessVoting).value;
  let submitAndPay = true;

  if (toValue(gvTotalBalance) > 0n) {
    if (!eth.signer) {
      throw new Error('No signer!');
    }

    const request = {
      dao: import.meta.env.VITE_CONTRACT_POLLMANAGER,
      voter: await eth.signer.getAddress(),
      proposalId: proposalId,
      choiceId: choice,
    };

    // Sign voting request
    const signature = await eth.signer.signTypedData(
      {
        name: 'GaslessVoting',
        version: '1',
        chainId: import.meta.env.VITE_NETWORK,
        verifyingContract: await gv.getAddress(),
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
    const submitAddr = randomchoice(toValue(gvAddrs));
    const submitNonce = await eth.provider.getTransactionCount(submitAddr);
    console.log(`Gasless voting, chose address:${submitAddr} (nonce: ${submitNonce})`);

    // Submit voting request to get signed transaction
    const feeData = await eth.provider.getFeeData();
    console.log('doVote.gasless: constructing tx', 'gasPrice', feeData.gasPrice);
    const tx = await gv.makeVoteTransaction(
      submitAddr,
      submitNonce,
      feeData.gasPrice!,
      request,
      toValue(aclProof),
      rsv,
    );

    // Submit pre-signed signed transaction
    let plain_resp;
    let receipt: TransactionReceipt | null = null;
    try {
      const txDecoded = Transaction.from(tx);
      const txDecodedGas = await eth.provider.estimateGas(txDecoded);
      console.log('TxDecodedGas', txDecodedGas);
      plain_resp = await eth.provider.broadcastTransaction(tx);
      console.log('doVote.gasless: waiting for tx', plain_resp.hash);
      receipt = await eth.provider.waitForTransaction(plain_resp.hash);
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
        tx_hash = `\n\nFalied tx: ${receipt.hash}`;
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
    await eth.switchNetwork(Network.FromConfig);
    const daoSigner = usePollManagerWithSigner();
    const tx = await daoSigner.vote(proposalId, choice, toValue(aclProof));
    const receipt = await tx.wait();

    if (receipt!.status != 1) throw new Error('cast vote tx failed');
  }

  existingVote.value = choice;
}

async function doTopup(addr: string) {
  let result = prompt(`Topup voting subsidy account:\n\n  ${addr}\n\nAmount (in ROSE):`, '1');
  if (!result) {
    return;
  }
  result = result.trim();
  const amount = parseEther(result);
  if (amount > 0n) {
    await eth.signer?.sendTransaction({
      to: addr,
      value: amount,
      data: '0x',
    });
  }
}

onMounted(async () => {
  const { active, params, topChoice } = await dao.value.PROPOSALS(proposalId);
  if (params.acl === ZeroAddress) {
    console.log(`Empty params! No ACL, Poll ${proposalId} not found!`);
    router.push({ path: `/NotFound/poll/${props.id}`, replace: true });
    return;
  }

  const proposal = { id: proposalId, active, topChoice, params };
  const ipfsData = await Pinata.fetchData(params.ipfsHash);
  const ipfsParams: Poll = decryptJSON(getBytes(proposal.params.ipfsSecret), ipfsData);
  poll.value = { proposal, ipfsParams } as unknown as PollManager.ProposalWithIdStructOutput & {
    ipfsParams: Poll;
  };
  if (!proposal.active) {
    voteCounts.value = await dao.value.getVoteCounts(proposalId);
    selectedChoice.value = winningChoice.value = proposal.topChoice;
    if (proposal.params.publishVotes) {
      votes.value = await dao.value.getVotes(proposalId, 0, 10);
    }
  }

  const acl = IPollACL__factory.connect(params.acl, eth.provider);
  const userAddress = eth.signer ? await eth.signer.getAddress() : ethers.ZeroAddress;

  canClosePoll.value = await acl.canManagePoll(
    await dao.value.getAddress(),
    proposalId,
    userAddress,
  );

  isTokenHolderACL.value = params.acl == import.meta.env.VITE_CONTRACT_ACL_TOKENHOLDER;
  isWhitelistACL.value = params.acl == import.meta.env.VITE_CONTRACT_ACL_VOTERALLOWLIST;
  isXChainACL.value = params.acl == import.meta.env.VITE_CONTRACT_ACL_STORAGEPROOF;

  if ('xchain' in ipfsParams.acl.options) {
    const xchain = (ipfsParams.acl.options as AclOptionsXchain).xchain;
    const provider = xchainRPC(xchain.chainId);
    xchainOptions.value = ipfsParams.acl.options;
    const signer_addr = await eth.signer?.getAddress();
    if (signer_addr) {
      const proof = await fetchStorageProof(
        provider,
        xchain.blockHash,
        xchain.address,
        xchain.slot,
        signer_addr,
      );
      console.log('Proof is', proof);
      aclProof.value = proof;
      canAclVote.value =
        0n !=
        (await acl.canVoteOnPoll(await dao.value.getAddress(), proposalId, userAddress, proof));
    }
  } else if ('token' in ipfsParams.acl.options) {
    const tokenAddress = ipfsParams.acl.options.token;
    aclProof.value = new Uint8Array();
    canAclVote.value =
      0n !=
      (await acl.canVoteOnPoll(
        await dao.value.getAddress(),
        proposalId,
        userAddress,
        toValue(aclProof),
      ));
    aclTokenInfo.value = await tokenDetailsFromProvider(
      tokenAddress,
      eth.provider as unknown as JsonRpcProvider,
    );
  } else if ('allowList' in ipfsParams.acl.options) {
    aclProof.value = new Uint8Array();
    canAclVote.value =
      0n !=
      (await acl.canVoteOnPoll(
        await dao.value.getAddress(),
        proposalId,
        userAddress,
        toValue(aclProof),
      ));
  } else if ('allowAll' in ipfsParams.acl.options) {
    aclProof.value = new Uint8Array();
    canAclVote.value =
      0n !=
      (await acl.canVoteOnPoll(
        await dao.value.getAddress(),
        proposalId,
        userAddress,
        toValue(aclProof),
      ));
  }

  // Retrieve gasless voting addresses & balances
  const gv = (await gaslessVoting).value;
  const addrsBalances = await gv.listAddresses(await toValue(dao).getAddress(), proposalId);
  gvAddrs.value = addrsBalances.out_addrs;
  gvBalances.value = addrsBalances.out_balances;
  if (addrsBalances.out_balances.length > 0) {
    gvTotalBalance.value = gvBalances.value.reduce((a, b) => a + b);
  } else {
    gvTotalBalance.value = 0n;
  }
  if (toValue(gvTotalBalance) > 0n) {
    console.log(
      'Gasless voting available',
      formatEther(toValue(gvTotalBalance)),
      'ROSE balance, addrs:',
      gvAddrs.value.join(', '),
    );
  }
});
</script>

<template>
  <section v-if="!hasVoted && !isClosed">
    <div v-if="poll">
      <div class="flex justify-between items-center mb-4">
        <h2 class="capitalize text-white text-2xl font-bold">{{ poll.ipfsParams.name }}</h2>
        <AppBadge :variant="poll.proposal.active ? 'active' : 'closed'">
          {{ poll.proposal.active ? 'Active' : 'Closed' }}
        </AppBadge>
      </div>
      <p class="text-white text-base mb-10" v-html="micromark(poll.ipfsParams.description)"></p>
      <form @submit="vote">
        <div v-if="poll?.ipfsParams.choices">
          <AppButton
            v-for="(choice, choiceId) in poll.ipfsParams.choices"
            :key="choiceId"
            :class="{
              selected: Number(selectedChoice) === choiceId || choiceId === Number(winningChoice),
              'pointer-events-none': isLoading || !poll.proposal.active,
            }"
            class="choice-btn mb-2 w-full"
            variant="choice"
            @click="
              selectedChoice = selectedChoice == BigInt(choiceId) ? undefined : BigInt(choiceId)
            "
            :disabled="
              !canSelect && winningChoice !== undefined && BigInt(choiceId) !== winningChoice
            "
          >
            <span class="flex gap-2">
              <CheckedIcon
                v-if="selectedChoice === BigInt(choiceId) || BigInt(choiceId) === winningChoice"
              />
              <UncheckedIcon v-else />
              <span class="leading-6" v-html="micromark(choice)"></span>
              <span class="leading-6" v-if="!poll.proposal.active"
                >({{ voteCounts[choiceId] }})</span
              >
            </span>
          </AppButton>
        </div>
        <p
          v-if="poll?.ipfsParams.options.publishVotes && poll.proposal.active"
          class="text-white text-base mt-10"
        >
          Votes will be made public after voting has ended.
        </p>
        <div
          v-if="poll?.ipfsParams.options.publishVotes && !poll.proposal.active"
          class="capitalize text-white text-2xl font-bold mt-10"
        >
          <label class="inline-block mb-5">Individual votes</label>
          <p
            v-for="(addr, i) in votes.out_voters[0]"
            :key="i"
            class="text-white text-base"
            variant="addr"
          >
            {{ addr }}: {{ poll.ipfsParams.choices[Number(votes.out_choices[i])] }}
          </p>
        </div>

        <div v-if="isTokenHolderACL" class="m-5 text-center text-white p-2">
          Voting on this poll is restricted to holders of a token on Sapphire.

          <div v-if="aclTokenInfo">
            <br />
            {{ aclTokenInfo.addr }}<br /><br />
            {{ aclTokenInfo.name }} (<b>{{ aclTokenInfo.symbol }}</b
            >)
          </div>
        </div>

        <div v-if="isWhitelistACL" class="text-white text-center m-5 p-2">
          Voting on this poll is restricted to a list of addresses.
        </div>

        <div v-if="isXChainACL" class="text-white text-center m-5 p-2">
          Only token holders of a cross-chain token may vote on this poll:<br /><br />
          Address: <b>{{ xchainOptions?.xchain.address }}</b
          ><br />
          Chain ID: <b>{{ xchainOptions?.xchain.chainId }}</b
          ><br />
          Slot: <b>{{ xchainOptions?.xchain.slot }}</b
          ><br />
          Snapshot Block: <b>{{ xchainOptions?.xchain.blockHash }}</b
          ><br />
        </div>

        <div
          v-if="poll?.proposal?.active && eth.signer && eth.isSapphire"
          class="flex justify-between items-start mt-6"
        >
          <AppButton
            type="submit"
            variant="primary"
            :disabled="!canVote || isLoading || isClosing"
            @click="vote"
          >
            <span v-if="isLoading">Submitting Vote…</span>
            <span v-else-if="!isLoading">Submit vote</span>
          </AppButton>

          <div v-if="canClosePoll">
            <AppButton variant="secondary" @click="closeBallot" :disabled="isClosing">
              <span v-if="isClosing">Closing...</span>
              <span v-else>Close poll</span>
            </AppButton>
          </div>
        </div>

        <div v-if="gvAddrs.length > 0" class="text-white text-base mt-10">
          <p class="mb-5 font-bold">Gasless voting enabled:</p>
          <ul>
            <li v-for="(item, index) in gvAddrs" :key="index">
              <abbr :title="item"
                ><code>{{ abbrAddr(item) }}</code></abbr
              >
              ({{ formatEther(gvBalances![index]) }} ROSE)
              <a
                v-if="eth.signer"
                href="#"
                @click.prevent="doTopup(item)"
                class="rounded bg-white text-black p-2 ml-5 text-xs"
              >
                Topup
              </a>
            </li>
          </ul>
        </div>

        <div v-else-if="poll?.proposal?.active">
          <br /><br />
          <section class="pt-5" v-if="!eth.signer">
            <h2 class="capitalize text-white text-2xl font-bold mb-4">
              Web3 Wallet Required to Vote
            </h2>
            <p class="text-white text-base mb-10">
              In order to continue to use the app and vote on a poll, please connect your Web3
              wallet by clicking on the "Connect" button below.
            </p>

            <div class="flex justify-center">
              <AppButton variant="secondary" @click="eth.connect">Connect</AppButton>
            </div>
          </section>
          <section class="pt-5" v-else-if="!eth.isSapphire">
            <h2 class="capitalize text-white text-2xl font-bold mb-4">
              Please Connect to Sapphire
            </h2>
            <p class="text-white text-base mb-10">
              In order to continue to use the app and vote on a poll, please switch your Web3 wallet
              to Oasis Sapphire by clicking on the "Switch" button below.
            </p>

            <div class="flex justify-center">
              <AppButton variant="secondary" @click="eth.connect">Switch</AppButton>
            </div>
          </section>
        </div>

        <p v-if="error" class="error mt-2 text-center">
          <span class="font-bold">{{ error }}</span>
        </p>
      </form>
    </div>

    <PollDetailsLoader v-else />
  </section>
  <section v-else-if="hasVoted">
    <SuccessInfo>
      <h3 class="text-white text-3xl mb-10">Thank you</h3>

      <AppButton
        v-if="poll?.ipfsParams?.choices && selectedChoice"
        class="mb-4 pointer-events-none cursor-not-allowed w-full voted"
        variant="choice"
      >
        <span class="flex gap-2">
          <CheckIcon class="w-7" />
          {{ poll.ipfsParams.choices[Number(selectedChoice)] }}
        </span>
      </AppButton>

      <p
        v-if="poll?.ipfsParams.options.publishVotes"
        class="text-white text-center text-base mb-24"
      >
        Your vote will be published after voting has ended.
      </p>

      <RouterLink to="/">
        <AppButton variant="secondary">Go to overview</AppButton>
      </RouterLink>
    </SuccessInfo>
  </section>
  <section v-else-if="isClosed">
    <SuccessInfo>
      <p class="text-white text-base mb-4">The poll has been closed.</p>

      <RouterLink to="/">
        <AppButton variant="secondary">Go to overview</AppButton>
      </RouterLink>
    </SuccessInfo>
  </section>
</template>

<style lang="postcss" scoped>
.error {
  @apply text-red-500;
}
</style>
