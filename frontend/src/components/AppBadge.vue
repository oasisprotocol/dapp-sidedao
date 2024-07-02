<template>
  <span
    class="badge"
    :class="{ 'badge-active': variant === 'active', 'badge-closed': variant === 'closed' }"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
defineProps<{
  variant: 'active' | 'closed';
}>();
</script>

<style scoped lang="postcss">
.badge {
  @apply text-white py-2 px-4 rounded-full;
}

.badge-active {
  background-color: #4cd4a9;
}

.badge-closed {
  @apply bg-gray-500;
}
</style>
