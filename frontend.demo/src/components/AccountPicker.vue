<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useEthereumStore } from '../stores/ethereum';
import JazzIcon from './JazzIcon.vue';
import { abbrAddr } from '@/utils';
import { useMedia } from '@/useMediaQuery';
import detectEthereumProvider from '@metamask/detect-provider';
import type { EIP1193Provider } from '@/stores/eip1193';

const eth = useEthereumStore();

const connecting = ref(false);
const isMetaMaskInstalled = ref(false);

async function connectWallet() {
  if (!isMetaMaskInstalled.value) {
    window.open('https://metamask.io/download/');
    return;
  }

  if (connecting.value) {
    return;
  }

  connecting.value = true;
  try {
    await eth.connect();
  } catch (err) {
    console.error(err);
    isMetaMaskInstalled.value = false;
  } finally {
    connecting.value = false;
  }
}

const isXlScreen = useMedia('(min-width: 1280px)');

onMounted(async () => {
  try {
    const provider = await detectEthereumProvider<EIP1193Provider>();
    if (provider) {
      isMetaMaskInstalled.value = true;
    }
  } catch (err) {
    console.error(err);
    isMetaMaskInstalled.value = false;
  }
});
</script>

<template>
  <button
    :class="{
      'cursor-default': !!eth.address,
      'cursor-pointer': !eth.address || !isMetaMaskInstalled,
    }"
    class="account-picker"
    @click="connectWallet"
  >
    <span class="account-picker-content" v-if="!connecting && eth.address">
      <JazzIcon :size="isXlScreen ? 30 : 30" :address="eth.address" />
      <span class="font-mono font-bold">
        <abbr :title="eth.address" class="block no-underline">{{ abbrAddr(eth.address) }}</abbr>
      </span>
    </span>
    <span class="account-picker-content" v-else-if="!isMetaMaskInstalled">
      <span>
        <span>Install MetaMask</span>
      </span>
    </span>
    <span class="account-picker-content" v-else>
      <span>
        <span v-if="connecting">Connecting…</span>
        <span v-else>Connect Wallet</span>
      </span>
    </span>
  </button>
</template>

<style lang="postcss" scoped>
.account-picker-content {
  @apply inline-flex items-center gap-1 xl:gap-6;
}

.account-picker {
  @apply inline-flex items-center border border-gray-900 rounded-xl bg-white border-primaryDark h-12 p-2 h-fit;
  border-width: 3px;
  border-style: solid;

  @media (max-width: 1280px) {
    border-width: 1px;
  }
}

span {
  @apply text-base text-primaryDark text-right xl:text-lg;
}

.unk-net {
  @apply text-red-500 underline decoration-wavy decoration-1;
}
</style>
