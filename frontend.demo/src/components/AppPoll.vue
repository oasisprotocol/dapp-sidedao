<template>
  <RouterLink :to="{ name: 'poll', params: { id: pollId } }">
    <div class="poll p-6 mb-6 rounded-xl border-2 border-gray-300">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-lg lg:text-lg mb-1">{{ name }}</h2>
        <div class="flex items-center">
          <JazzIcon class="mr-2" :size="20" :address="creatorAddress" />
          <abbr :title="creatorAddress" class="font-mono block no-underline">{{
            abbrAddr(creatorAddress)
          }}</abbr>
        </div>
      </div>
      <p class="text-gray-600 text-base" v-html="micromark(description)"></p>
      <div class="p-5" v-if="choices?.length">
        <AppButton
          v-for="(choice, choiceId) in choices"
          :class="{
            voted: choiceId === outcome,
          }"
          class="choice-btn mb-2 pointer-events-none cursor-not-allowed w-full"
          :key="choice"
          variant="choice"
          :disabled="choiceId !== outcome"
        >
          <span class="flex gap-2">
            <CheckIcon class="w-7" v-if="choiceId === outcome" />
            <span class="w-7" v-else></span>
            {{ choice }}
          </span>
        </AppButton>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import {micromark} from 'micromark';
import JazzIcon from '@/components/JazzIcon.vue';
import { abbrAddr } from '@/utils';
import AppButton from '@/components/AppButton.vue';
import CheckIcon from '@/components/CheckIcon.vue';

defineProps<{
  pollId?: string;
  creatorAddress: string;
  name: string;
  description: string;
  choices?: string[];
  outcome?: number;
  active?: boolean;
}>();
</script>

<style scoped lang="postcss">
.poll {
  @apply bg-white rounded-xl border-primary;
  border-width: 3px;
  border-style: solid;
  box-shadow: 0 7px 7px 0 rgba(0, 0, 0, 0.17);
}
</style>
