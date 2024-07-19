<script setup lang="ts">
import { ref, watch, computed, toValue } from 'vue';

import AppButton from '@/components/AppButton.vue';
import CheckIcon from '@/components/CheckIcon.vue';

import RemoveIcon from '@/components/RemoveIcon.vue';
import AddIcon from '@/components/AddIcon.vue';
import SuccessInfo from '@/components/SuccessInfo.vue';
import { retry, Pinata, encryptJSON } from '@/utils';
import type { PollManager, AclOptions, Poll } from '@oasisprotocol/side-dao-contracts';
import { getAddress, parseEther, JsonRpcProvider, AbiCoder } from 'ethers';
import { BlockOptions } from "@ethereumjs/block";

import { usePollManager, usePollManagerWithSigner } from '../contracts';
import { useEthereumStore } from '../stores/ethereum';
import { computedAsync } from '../utils';
import { loadKZG } from 'kzg-wasm?init'

import {
  fetchAccountProof,
  getBlockHeaderRLP,
  guessStorageSlot,
  isERCTokenContract,
  tokenDetailsFromProvider,
  xchain_ChainNamesToChainId,
  xchainRPC,
} from '@oasisprotocol/side-dao-contracts';
import { Chain, Common, CustomChain, Hardfork } from '@ethereumjs/common';

const eth = useEthereumStore();
const dao = usePollManager();

const errors = ref<string[]>([]);
const pollName = ref('');
const pollDesc = ref('');
const choices = ref<Array<{ key: number; value: string }>>(
  Array.from({ length: 3 }, (_, key) => ({
    key,
    value: '',
  })),
);

// Subsidy management
const hasSubsidy = ref(false);
const subsidyAmountStr = ref('');
const subsidyAmount = ref<bigint | undefined>(undefined);
const isSubsidyValid = computed(() => {
  if (toValue(hasSubsidy)) {
    const amountStr = subsidyAmountStr.value;
    if (!amountStr) {
      subsidyAmount.value = undefined;
      return false;
    }
    try {
      subsidyAmount.value = parseEther(amountStr);
      return true;
    } catch (e: any) {
      subsidyAmount.value = undefined;
      return false;
    }
  }
  subsidyAmount.value = undefined;
  return true;
});

// Poll ACL management
const acl_allowAll = import.meta.env.VITE_CONTRACT_ACL_ALLOWALL;
const acl_tokenHolder = import.meta.env.VITE_CONTRACT_ACL_TOKENHOLDER;
const acl_allowList = import.meta.env.VITE_CONTRACT_ACL_VOTERALLOWLIST;
const acl_xchain = import.meta.env.VITE_CONTRACT_ACL_STORAGEPROOF;
const chosenPollACL = ref(acl_allowAll);

// Allow list ACL stuff
const acl_allowList_addressesStr = ref('');
const acl_allowList_addresses = computed(() => {
  // Split by newlines and commas, trim everything
  const in_addrs = toValue(acl_allowList_addressesStr)
    .split('\n')
    .flatMap((x) => x.split(','))
    .flatMap((x) => x.split(' '))
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
  //
  // Validate all extracted addresses
  let invalid: Record<string, string> | undefined = {};
  let addrs = [];
  let hasInvalid = false;
  for (const x of in_addrs) {
    try {
      addrs.push(getAddress(x));
    } catch (e: any) {
      if (e.code == 'INVALID_ARGUMENT') {
        invalid[x] = e.shortMessage;
        hasInvalid = true;
      }
    }
  }
  if (!hasInvalid) {
    invalid = undefined;
  }
  return { addrs, invalid };
});

// Sapphire token holder ACL stuff
const token_addr = ref<string>('');
const token_error = computed<string | undefined>(() => {
  const v = toValue(token_addr);
  if (v) {
    try {
      getAddress(v);
    } catch (e: any) {
      if (e.code == 'INVALID_ARGUMENT') {
        return e.shortMessage;
      }
    }
  }
  return undefined;
});
const token_valid = computed(() => {
  return toValue(token_addr) && toValue(token_error) === undefined;
});
const token_details = computedAsync(async () => {
  if (!toValue(token_valid)) {
    return;
  }
  const addr = toValue(token_addr);
  if (addr) {
    return await tokenDetailsFromProvider(addr, eth.provider as unknown as JsonRpcProvider);
  }
});

// Cross-Chain DAO ACL stuff
const xchain_chainId = ref<number>(1);
const xchain_hash = ref<string>('');
const xchain_height = ref<number>();
const xchain_addr = ref<string>('');
const xchain_addr_valid = ref<boolean>(false);
const xchain_holder = ref<string>('');
const xchain_holder_balance = ref<bigint>();
const xchain_holder_valid = ref<boolean>(false);
const xchain_slot = ref<number>();
const xchain_slot_valid = ref<boolean>(false);
const xchain_rpc = computed<JsonRpcProvider | undefined>(() => {
  const chainId = toValue(xchain_chainId);
  if (chainId) {
    return xchainRPC(chainId);
  }
  return undefined;
});

watch(xchain_addr, async (xchain_addr) => {
  let addr;
  try {
    addr = getAddress(toValue(xchain_addr));
    console.log('Got addr', addr);
  } catch (e) {
    xchain_addr_valid.value = false;
    return;
  }

  const rpc = toValue(xchain_rpc);
  if (!rpc) {
    return;
  }

  try {
    if (await isERCTokenContract(rpc, addr)) {
      console.log('xchain_addr is Token');
      xchain_addr_valid.value = true;
      return;
    }
  } catch (e: any) {
    console.log('xchain_addr is not token!');
  }

  xchain_addr_valid.value = false;
});

watch(xchain_holder, async (xchain_holder) => {
  const rpc = toValue(xchain_rpc);
  if (rpc && toValue(xchain_addr_valid)) {
    const addr = toValue(xchain_addr);
    const holder = toValue(xchain_holder);
    const slot = await guessStorageSlot(rpc, addr, holder);
    if (slot) {
      console.log('Slot is', slot);
      xchain_holder_valid.value = true;
      xchain_holder_balance.value = slot.balance;
      xchain_slot.value = slot.index;
      xchain_slot_valid.value = true;

      if (!xchain_hash.value) {
        await xchain_refresh();
      }
    }
  }
});

// Retrieve latest block hash from the chain
async function xchain_refresh() {
  const rpc = toValue(xchain_rpc);
  const block = await rpc!.getBlock('latest');
  if (block && block.hash) {
    xchain_hash.value = block.hash;
    xchain_height.value = block.number;
    return block.hash;
  }
}

// Optional expiration date must be in future & must parse correctly
const hasExpiration = ref(false);
const expirationTimeString = ref('');

const expirationTime = computed<Date | undefined>(() => {
  const ets = toValue(expirationTimeString);
  if (!ets) {
    return undefined;
  }
  const x = new Date(ets);
  return !isNaN(x.valueOf()) ? x : undefined;
});

const expirationIsInPast = computed<boolean | undefined>(() => {
  if (hasExpiration.value) {
    if (expirationTime.value !== undefined) {
      if (expirationTime.value < new Date()) {
        return true;
      }
      return false;
    }
  }
  return undefined;
});

/// false if `has expiration` checked but invalid or historic date
const isDateValid = computed(() => {
  if (toValue(hasExpiration)) {
    const et = toValue(expirationTime);
    if (et !== undefined) {
      if (et > new Date()) {
        return true;
      }
    }
    return false;
  }
  return true;
});

const canCreatePoll = computed(() => {
  const acl = toValue(chosenPollACL);
  if (acl == acl_xchain) {
    return (
      !toValue(isLoading) &&
      toValue(isDateValid) &&
      toValue(isSubsidyValid) &&
      toValue(xchain_addr_valid) &&
      toValue(xchain_holder_valid.value && xchain_slot.value !== undefined)
    );
  }

  return !toValue(isLoading) && toValue(isDateValid) && toValue(isSubsidyValid);
});

const publishVotes = ref(false);
const isLoading = ref(false);
const proposalId = ref('');

let choiceCount = 3;
const removeChoice = (i: number) => choices.value.splice(i, 1);
const addChoice = () => {
  choices.value.push({ key: choiceCount, value: '' });
  choiceCount++;
};

async function createPoll(e: Event): Promise<void> {
  if (e.target instanceof HTMLFormElement) {
    e.target.checkValidity();
    if (!e.target.reportValidity()) return;
  }
  e.preventDefault();
  try {
    errors.value.splice(0, errors.value.length);
    isLoading.value = true;
    proposalId.value = await doCreatePoll();
  } catch (e: any) {
    errors.value.push(`Failed to create poll: ${e.message ?? JSON.stringify(e)}`);
    console.error(e);
  } finally {
    isLoading.value = false;
  }
}

async function getBlockOptions(chainId: number): Promise<BlockOptions> {
  switch (chainId) {
    case 1: // Eth Mainnet
      // eslint-disable-next-line no-case-declarations
      const kzg = await loadKZG();
      return {
        common: new Common({
          chain: Chain.Mainnet,
          hardfork: Hardfork.Cancun,
          customCrypto: {
            kzg: kzg as any,
          },
        }),
      }

    case 137: // Polygon Mainnet
      return {
        common: Common.custom(CustomChain.PolygonMainnet, {hardfork: 'london'}),
        skipConsensusFormatValidation: true
      }

    default:
      console.log("No block options available for", chainId)
      return {}
  }
}

/// Returns the `data` parameter used to initialize the ACL when creating a poll
async function getACLOptions(): Promise<[string, AclOptions]> {
  const acl = toValue(chosenPollACL);
  const abi = AbiCoder.defaultAbiCoder();
  if (acl == acl_allowAll) {
    return [
      '0x', // Empty bytes is passed
      {
        address: acl,
        options: { allowAll: true },
      },
    ];
  }

  if (acl == acl_tokenHolder) {
    const addr = toValue(token_addr);
    return [
      abi.encode(['address'], [addr]),
      {
        address: acl,
        options: { token: addr },
      },
    ];
  }

  if (acl == acl_allowList) {
    const { addrs, invalid } = toValue(acl_allowList_addresses);
    if (invalid) {
      console.log('Invalid is', invalid);
      console.log('Addrs is', addrs);
      throw new Error('Cannot setup allow list while invalid entries exist');
    }
    return [
      abi.encode(['address[]'], [addrs]),
      {
        address: acl,
        options: { allowList: true },
      },
    ];
  }

  if (acl == acl_xchain) {
    const chainId = toValue(xchain_chainId);
    const rpc = xchainRPC(chainId);
    const blockHash = toValue(xchain_hash);
    const contractAddress = toValue(xchain_addr);
    const blockOptions = await getBlockOptions(chainId)
    const headerRlpBytes = await getBlockHeaderRLP(rpc, blockHash, blockOptions);
    const rlpAccountProof = await fetchAccountProof(rpc, blockHash, contractAddress);
    console.log('headerRlpBytes', headerRlpBytes);
    console.log('rlpAccountProof', rlpAccountProof);
    return [
      abi.encode(
        ['tuple(tuple(bytes32,address,uint256),bytes,bytes)'],
        [
          [
            // PollCreationOptions
            [
              // PollSettings
              blockHash,
              contractAddress,
              toValue(xchain_slot),
            ],
            headerRlpBytes,
            rlpAccountProof,
          ],
        ],
      ),
      {
        address: acl,
        options: {
          xchain: {
            chainId,
            blockHash,
            address: contractAddress,
            slot: toValue(xchain_slot)!,
          },
        },
      },
    ];
  }

  throw new Error(`Unknown ACL contract ${acl}`);
}

async function doCreatePoll(): Promise<string> {
  if (errors.value.length > 0) return '';

  const [aclData, aclOptions] = await getACLOptions();

  const poll: Poll = {
    creator: eth.address!,
    name: pollName.value,
    description: pollDesc.value,
    choices: choices.value.map((c) => c.value),
    options: {
      publishVotes: publishVotes.value,
      closeTimestamp: toValue(expirationTime) ? toValue(expirationTime)!.valueOf() / 1000 : 0,
    },
    acl: aclOptions,
  };
  const { key, cipherbytes } = encryptJSON(poll);

  const ipfsHash = await Pinata.pinData(cipherbytes);
  console.log('Poll ipfsHash', ipfsHash);

  const proposalParams: PollManager.ProposalParamsStruct = {
    ipfsHash,
    ipfsSecret: key,
    numChoices: choices.value.length,
    publishVotes: poll.options.publishVotes,
    closeTimestamp: poll.options.closeTimestamp,
    acl: toValue(chosenPollACL),
  };

  console.log('doCreatePoll: Using direct transaction to create proposal');

  // TODO: check if proposal already exists on the host chain and continue if so (idempotence)
  //proposalId = await dao.value.callStatic.createProposal(proposalParams);
  //console.log('doCreatePoll: creating proposal', proposalId);

  const daoSigner = usePollManagerWithSigner();
  const createProposalTx = await daoSigner.create(proposalParams, aclData, {
    // Provide additional subsidy
    value: toValue(subsidyAmount) ?? 0n,
  });
  console.log('doCreatePoll: creating proposal tx', createProposalTx.hash);

  const receipt = (await createProposalTx.wait())!;
  if (receipt.status !== 1) {
    throw new Error('createProposal tx receipt reported failure.');
  }
  const proposalId = receipt.logs[0].data;

  console.log('doCreatePoll: Proposal ID', proposalId);

  return retry<ReturnType<typeof dao.value.ballotIsActive>>(
    dao.value.ballotIsActive(proposalId),
    (isActive) => {
      if (!isActive) {
        throw new Error('Unable to determine the status of proposal.');
      }
      return isActive;
    },
  )
    .then(() => proposalId.replace('0x', ''))
    .catch((err) => {
      errors.value.push(`Failed to create poll: ${err.message ?? JSON.stringify(err)}`);
      return '';
    });
}
</script>

<template>
  <div v-if="eth.signer">
    <section v-if="!proposalId">
      <p class="text-white text-base mb-5 text-center">
        Once created, your poll will be live immediately and responses will start being recorded.
      </p>

      <form @submit="createPoll">
        <div class="form-group">
          <input
            type="text"
            id="question"
            class="peer"
            placeholder=" "
            v-model="pollName"
            required
          />
          <label
            for="question"
            class="peer-focus:text-primaryDark peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-5"
          >
            Question
            <span class="text-red-500">*</span>
          </label>
        </div>

        <div class="form-group form-group-textarea">
          <textarea id="description" class="peer" placeholder=" " v-model="pollDesc" rows="3" />
          <label
            for="description"
            class="peer-focus:text-primaryDark peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-5"
          >
            Description
          </label>
        </div>

        <div class="form-group-extended">
          <label class="inline-block mb-5"
            >Answers
            <span class="text-red-500">*</span>
          </label>
          <div
            class="relative flex justify-between items-center mb-4 gap-3 px-5"
            v-for="(choice, i) in choices"
            :key="choice.key"
          >
            <input
              class="focus:outline-none focus:ring-0 pb-2 text-primaryDark"
              type="text"
              id="name"
              :placeholder="`${i + 1}. Answer`"
              v-model="choices[i].value"
              required
            />

            <RemoveIcon
              class="cursor-pointer absolute right-5 bottom-2"
              :class="{
                'cursor-default': isLoading,
              }"
              :disabled="isLoading"
              v-if="choices.length > 2"
              :data-ix="i"
              @click.prevent="removeChoice(i)"
            ></RemoveIcon>
          </div>
          <AppButton
            class="ml-5"
            size="small"
            variant="tertiary"
            :disabled="isLoading"
            @click.prevent="addChoice"
          >
            <span class="flex gap-2">
              <AddIcon />
              <span class="leading-6">Add answer</span>
            </span>
          </AppButton>
        </div>

        <div class="form-group-extended">
          <!-- Individual Votes -->
          <div class="flex mb-5 pl-5 pt-5">
            <input
              id="publish-votes"
              class="w-5 h-5 border-2 border-gray-500"
              type="checkbox"
              v-model="publishVotes"
            />
            <label class="ml-3 text-base text-gray-900" for="publish-votes">
              Publish individual votes after voting has ended.
            </label>
          </div>
          <!-- / Individual Votes -->

          <!-- Expiration -->
          <div class="flex mb-5 pl-5">
            <input
              id="has-expiration"
              class="w-5 h-5 border-2 border-gray-500"
              type="checkbox"
              v-model="hasExpiration"
            />
            <label class="ml-3 text-base text-gray-900" for="has-expiration">
              <div v-if="hasExpiration">
                <input type="datetime-local" v-model="expirationTimeString" />

                <div v-if="expirationTime" class="mt-3 text-gray-500">
                  {{ expirationTime }}

                  <div v-if="expirationIsInPast" class="mt-2">
                    <b>Poll close date must be in the future!</b>
                  </div>
                </div>
              </div>
              <div v-else>Set poll closing date & time</div>
            </label>
          </div>
          <!-- / Expiration -->

          <!-- Subsidy -->
          <div class="flex mb-5 pl-5">
            <input
              id="has-subsidy"
              class="w-5 h-5 border-2 border-gray-500"
              type="checkbox"
              v-model="hasSubsidy"
            />

            <label class="ml-3 text-base text-gray-900" for="has-subsidy">
              Subsidise votes <small>(let people submit votes without paying gas)</small>

              <span v-if="hasSubsidy"> <input v-model="subsidyAmountStr" type="text" /> ROSE </span>
            </label>
          </div>
          <!-- / Subsidy -->

          <!-- ACL -->
          <div class="flex mb-5 pl-5">
            <label for="poll-acl" class="mr-3 text-base text-gray-900 p-3"> ACL: </label>
            <select id="poll-acl" class="p-3" v-model="chosenPollACL">
              <option :value="acl_allowAll">Allow All</option>
              <option :value="acl_tokenHolder">Holds Token on Sapphire</option>
              <option :value="acl_allowList">Address Whitelist</option>
              <option :value="acl_xchain">Cross-Chain DAO</option>
            </select>
          </div>
          <!-- / ACL -->

          <div v-if="toValue(chosenPollACL) == acl_tokenHolder">
            <div class="mb-5 pl-5">
              <label for="holder-addr"> Token Address: </label>
              <input type="text" id="holder-addr" v-model="token_addr" />

              <!-- TODO: show token details -->
              <div v-if="token_error" class="mt-1 text-red-500">
                {{ token_error }}
              </div>
              <div v-if="token_valid" class="text-gray-500 mt-1">
                <span v-if="token_details">
                  {{ token_details?.name }}
                  ({{ token_details?.symbol }})
                </span>
              </div>
            </div>
          </div>
          <!-- / Token Holder ACL-->

          <div v-if="toValue(chosenPollACL) == acl_allowList">
            <label for="acl-allowlist">
              Allowed Addresses:
              <small>(comma and/or newline separated)</small>
            </label>
            <textarea id="acl-allowlist" v-model="acl_allowList_addressesStr"></textarea>

            <div v-if="acl_allowList_addresses.invalid">
              <ul>
                <li v-for="(item, key) in acl_allowList_addresses.invalid" :key="key">
                  {{ item }}: {{ key }}
                </li>
              </ul>
            </div>
          </div>
          <!-- / Allow List ACL-->

          <div v-if="toValue(chosenPollACL) == acl_xchain">
            <div class="mb-5 pl-5">
              <label for="xchain-chainid" class="mr-3 text-base text-gray-900 p-3"> Chain: </label>
              <select v-model="xchain_chainId" id="xchain-chainid" class="p-3">
                <option value="">-- Custom --</option>
                <option v-for="(key, item) in xchain_ChainNamesToChainId" :value="key" :key="key">
                  {{ item }} ({{ key }})
                </option>
              </select>
            </div>
            <!-- / Select Chain -->
            <div class="mb-5 pl-5">
              <label for="xchain-addr">
                <span class="flex gap-2"> Address<CheckIcon v-if="xchain_addr_valid" /> </span>
              </label>
              <input
                type="text"
                id="xchain-addr"
                v-model="xchain_addr"
                placeholder="Token address on chain"
              />
              <div v-if="!xchain_addr_valid && xchain_addr">Is not a valid token on chain!</div>
            </div>
            <!-- / Token or DAO -->
            <div class="mb-5 pl-5" v-if="xchain_addr_valid">
              <label for="xchain-holder">
                <span class="flex gap-2"> Holder<CheckIcon v-if="xchain_holder_valid" /> </span>
              </label>
              <input
                type="text"
                id="xchain-holder"
                v-model="xchain_holder"
                placeholder="Wallet address of a token holder"
              />
            </div>
            <!-- / Token or DAO -->
            <div class="mb-5 pl-5" v-if="xchain_holder_valid">
              <label for="xchain-slot">
                <span class="flex gap-2">
                  Storage Slot<CheckIcon v-if="(xchain_holder_balance ?? 0) > 0" />
                </span>
              </label>
              <input
                type="text"
                id="xchain-slot"
                v-model="xchain_slot"
                placeholder="Solidity storage slot"
              />
              <span>
                {{
                  (xchain_holder_balance ?? 0) > 0
                    ? `NOTE. Account holds a balance of ${xchain_holder_balance}`
                    : ''
                }}
              </span>
            </div>
            <!-- / X-Chain Slot -->
            <div class="mb-5 pl-5" v-if="xchain_holder_valid">
              <label for="xchain-hash">
                <button
                  @click.prevent="xchain_refresh"
                  v-if="xchain_chainId"
                  class="bg-blue-500 rounded p-1 px-2 text-white"
                >
                  Refresh block
                </button>
              </label>
              <input
                type="text"
                id="xchain-hash"
                v-model="xchain_hash"
                placeholder="Hash of block for snapshot"
              />
              <span>
                {{ (xchain_height ?? 0) > 0 ? `NOTE. Block height is ${xchain_height}` : '' }}
              </span>
            </div>
            <!-- / Block Hash -->
          </div>
          <!-- / X-Chain ACL -->
        </div>
        <!-- / Extended options -->

        <div class="flex justify-center">
          <div v-if="eth.isHomeChain">
            <AppButton type="submit" variant="primary" :disabled="!canCreatePoll">
              <span v-if="isLoading">Creating…</span>
              <span v-else> Create Poll </span>
            </AppButton>
          </div>
          <div v-else>
            <section class="pt-5">
              <h2 class="capitalize text-white text-2xl font-bold mb-4">Wrong Web3 Chain!</h2>
              <p class="text-white text-base mb-10">
                In order to continue to use the app, please switch your Web3 wallet to the correct
                chain, by clicking on the "Connect" button below.
              </p>

              <div class="flex justify-center">
                <AppButton variant="secondary" @click="eth.connect">Switch Chain</AppButton>
              </div>
            </section>
          </div>
        </div>

        <div v-if="errors.length > 0" class="text-red-500 px-3 mt-5 rounded-xl-sm">
          <span class="font-bold">Errors:</span>
          <ul class="list-disc px-8">
            <li v-for="error in errors" :key="error">{{ error }}</li>
          </ul>
        </div>
      </form>
    </section>
    <section v-else>
      <SuccessInfo>
        <h3 class="text-white text-3xl mb-4">Success</h3>
        <p class="text-white text-base">Your poll is live.</p>
        <p class="text-white text-base mb-24">Votes will be recorded from now on.</p>

        <RouterLink :to="{ name: 'poll', params: { id: proposalId } }">
          <AppButton variant="secondary">View poll</AppButton>
        </RouterLink>
      </SuccessInfo>
    </section>
  </div>
  <div v-else>
    <section class="pt-5">
      <h2 class="capitalize text-white text-2xl font-bold mb-4">No Web3 Wallet Connected!</h2>
      <p class="text-white text-base mb-10">
        In order to continue to use the app, please connect your Web3 wallet and switch to the
        correct chain, by clicking on the "Connect" button below.
      </p>

      <div class="flex justify-center">
        <AppButton variant="secondary" @click="eth.connect">Connect</AppButton>
      </div>
    </section>
  </div>
</template>

<style scoped lang="postcss">
.form-group,
.form-group-extended {
  @apply relative mb-6;
}

.form-group input,
textarea {
  @apply block rounded-xl py-6 px-5 w-full text-base text-black appearance-none focus:outline-none focus:ring-0 bg-white;
}

.form-group label {
  @apply absolute text-base text-primaryDark duration-300 transform -translate-y-5 scale-75 top-6 z-10 origin-[0] left-5;
}

.form-group-textarea {
  @apply overflow-hidden;
}

.form-group-textarea textarea {
  @apply pt-6;
}

.form-group-textarea label {
  @apply top-6 h-10;
  width: calc(130% - 14px);
}

.form-group-textarea label::before {
  @apply h-10 -top-3 absolute bg-white;
  z-index: -1;
  content: ' ';
  width: calc(100% - 14px); /* scrollbar */
}

.form-group-extended {
  @apply block rounded-xl py-6 px-5 w-full appearance-none focus:outline-none focus:ring-0 bg-white;
}

.form-group-extended > label {
  @apply text-base text-primaryDark;
}

.form-group-extended input:not([type='checkbox']) {
  @apply w-full;
  border-bottom: 1px solid rgba(0, 0, 0, 0.42);
}
</style>
