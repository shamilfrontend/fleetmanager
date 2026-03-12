<script setup lang="ts">
import Sidebar from '@/components/common/Sidebar.vue';
import Header from '@/components/common/Header.vue';
</script>

<template>
	<div class="layout layout-vertical">
		<Sidebar />
		<div class="layout-content">
			<Header />
			<main class="main-content">
				<router-view />
			</main>
		</div>
	</div>
</template>

<style scoped lang="scss">
@import '@/assets/scss/variables.scss';

.layout {
	display: flex;
	min-height: 100vh;
}

.layout-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.main-content {
	flex: 1;
	padding: $spacing-lg;
	overflow-y: auto;
}

@media (max-width: 768px) {
	.main-content {
		padding: $spacing-md;
	}
}
</style>
