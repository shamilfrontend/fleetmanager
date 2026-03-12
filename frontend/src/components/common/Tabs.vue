<script setup lang="ts">
import { ref } from 'vue';

export interface TabItem {
	label: string
	value?: string
}

const props = defineProps<{
	tabs: TabItem[]
	modelValue: number
}>();

const emit = defineEmits<{
	'update:modelValue': [index: number]
}>();

const uid = ref(`tabs-${Math.random().toString(36).slice(2, 9)}`);

const select = (index: number) => {
	if (index >= 0 && index < props.tabs.length) {
		emit('update:modelValue', index);
	}
};

const onKeydown = (e: KeyboardEvent, index: number) => {
	let next = -1;
	if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
		e.preventDefault();
		next = Math.min(index + 1, props.tabs.length - 1);
	} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
		e.preventDefault();
		next = Math.max(index - 1, 0);
	} else if (e.key === 'Home') {
		e.preventDefault();
		next = 0;
	} else if (e.key === 'End') {
		e.preventDefault();
		next = props.tabs.length - 1;
	}
	if (next >= 0 && next !== index) {
		select(next);
		const el = document.getElementById(`tab-${uid.value}-${next}`);
		el?.focus();
	}
};
</script>

<template>
	<div class="tabs">
		<div class="tabs__list" role="tablist" aria-label="Вкладки">
			<button
				v-for="(tab, index) in tabs"
				:key="index"
				type="button"
				role="tab"
				:aria-selected="modelValue === index"
				:aria-controls="`tabpanel-${uid}-${index}`"
				:id="`tab-${uid}-${index}`"
				class="tabs__tab"
				:class="{ 'tabs__tab--active': modelValue === index }"
				@click="select(index)"
				@keydown="onKeydown($event, index)"
			>
				{{ tab.label }}
			</button>
		</div>
		<div
			v-for="(tab, index) in tabs"
			:key="index"
			:id="`tabpanel-${uid}-${index}`"
			role="tabpanel"
			:aria-labelledby="`tab-${uid}-${index}`"
			class="tabs__panel"
			:class="{ 'tabs__panel--active': modelValue === index }"
			:hidden="modelValue !== index"
		>
			<slot :name="`panel-${index}`" />
		</div>
	</div>
</template>

<style scoped lang="scss">
@import '@/assets/scss/variables.scss';

.tabs {
	display: flex;
	flex-direction: column;
}

.tabs__list {
	display: flex;
	gap: 0;
	border-bottom: 1px solid $border-medium;
	margin-bottom: $spacing-md;
}

.tabs__tab {
	padding: $spacing-sm $spacing-md;
	font-size: $font-size-base;
	font-weight: $font-weight-medium;
	color: $text-muted;
	background: none;
	border: none;
	border-bottom: 2px solid transparent;
	cursor: pointer;
	margin-bottom: -1px;
	transition: color $transition-fast, border-color $transition-fast;

	&:hover {
		color: $text-primary;
	}

	&:focus-visible {
		outline: 2px solid $primary-color;
		outline-offset: 2px;
	}

	&--active {
		color: $primary-color;
		border-bottom-color: $primary-color;
	}
}

.tabs__panel {
	&:not(&--active) {
		display: none;
	}
}
</style>
