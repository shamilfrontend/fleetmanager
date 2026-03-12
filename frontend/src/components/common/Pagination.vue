<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface Props {
	currentPage: number
	pageSize: number
	total: number
}

const props = defineProps<Props>();

const localPageSize = ref(props.pageSize);

watch(() => props.pageSize, (newSize) => {
	localPageSize.value = newSize;
});

defineEmits<{
	'update:currentPage': [page: number]
	'update:pageSize': [size: number]
}>();

const totalPages = computed(() => {
	const total = Number(props.total) || 0;
	const pageSize = Number(props.pageSize) || 25;
	if (total === 0 || pageSize === 0) return 1;
	return Math.ceil(total / pageSize) || 1;
});

const startItem = computed(() => {
	const total = Number(props.total) || 0;
	const currentPage = Number(props.currentPage) || 1;
	const pageSize = Number(props.pageSize) || 25;

	if (total === 0) return 0;
	if (isNaN(currentPage) || isNaN(pageSize)) return 0;

	const start = (currentPage - 1) * pageSize + 1;
	return isNaN(start) ? 0 : start;
});

const endItem = computed(() => {
	const total = Number(props.total) || 0;
	const currentPage = Number(props.currentPage) || 1;
	const pageSize = Number(props.pageSize) || 25;

	if (total === 0) return 0;
	if (isNaN(currentPage) || isNaN(pageSize)) return 0;

	const end = Math.min(currentPage * pageSize, total);
	return isNaN(end) ? 0 : end;
});

const visiblePages = computed(() => {
	const pages: number[] = [];
	const maxVisible = 5;
	let start = Math.max(1, props.currentPage - Math.floor(maxVisible / 2));
	const end = Math.min(totalPages.value, start + maxVisible - 1);

	if (end - start < maxVisible - 1) {
		start = Math.max(1, end - maxVisible + 1);
	}

	for (let i = start; i <= end; i++) {
		pages.push(i);
	}

	return pages;
});
</script>

<template>
	<div class="pagination">
		<div class="pagination-info">
			Показано {{ startItem }}-{{ endItem }} из {{ total }}
		</div>
		<div class="pagination-controls">
			<button
				class="pagination-btn"
				:disabled="currentPage === 1"
				@click="$emit('update:currentPage', currentPage - 1)"
			>
				←
			</button>
			<span class="pagination-pages">
				<button
					v-for="page in visiblePages"
					:key="page"
					class="pagination-btn"
					:class="{ 'pagination-btn--active': page === currentPage }"
					@click="$emit('update:currentPage', page)"
				>
					{{ page }}
				</button>
			</span>
			<button
				class="pagination-btn"
				:disabled="currentPage === totalPages"
				@click="$emit('update:currentPage', currentPage + 1)"
			>
				→
			</button>
		</div>
		<div class="pagination-size">
			<label>На странице:</label>
			<select v-model="localPageSize" @change="$emit('update:pageSize', Number(localPageSize))">
				<option :value="10">10</option>
				<option :value="25">25</option>
				<option :value="50">50</option>
				<option :value="100">100</option>
			</select>
		</div>
	</div>
</template>

<style scoped lang="scss">
@import '@/assets/scss/variables.scss';

.pagination {
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-wrap: wrap;
	gap: $spacing-md;
	padding: $spacing-md;
	background: $bg-elevated;
	border-radius: $radius;
	box-shadow: $shadow-sm;
	border: 1px solid $border-light;
	margin-top: $spacing-md;
}

.pagination-info {
	font-size: $font-size-sm;
	color: $text-muted;
}

.pagination-controls {
	display: flex;
	align-items: center;
	gap: $spacing-xs;
}

.pagination-pages {
	display: flex;
	gap: $spacing-xs;
}

.pagination-btn {
	padding: $spacing-xs $spacing-sm;
	border: 1px solid $border-medium;
	border-radius: $radius-sm;
	background: $bg-elevated;
	cursor: pointer;
	font-size: $font-size-sm;
	font-weight: $font-weight-medium;
	min-width: 36px;
	transition: background-color $transition-fast, border-color $transition-fast, color $transition-fast;

	&:hover:not(:disabled) {
		background: $bg-subtle;
		border-color: $primary-color;
		color: $primary-color;
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	&--active {
		background: $primary-color;
		color: white;
		border-color: $primary-color;
	}
}

.pagination-size {
	display: flex;
	align-items: center;
	gap: $spacing-sm;

	label {
		font-size: $font-size-sm;
		color: $text-muted;
	}

	select {
		padding: $spacing-xs $spacing-sm;
		border: 1px solid $border-medium;
		border-radius: $radius-sm;
		font-size: $font-size-sm;
		cursor: pointer;
		background: $bg-elevated;

		&:focus {
			outline: none;
			border-color: $primary-color;
		}
	}
}
</style>
