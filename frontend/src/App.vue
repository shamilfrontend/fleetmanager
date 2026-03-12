<script setup lang="ts">
import Toast from '@/components/common/Toast.vue';

defineOptions({ name: 'App' });
</script>

<template>
	<router-view />

	<Toast />
</template>
