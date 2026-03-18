<script setup lang="ts">
import { ref, onUnmounted, watch } from 'vue';

export interface DropdownItem {
	id: string
	label: string
	type?: 'primary' | 'danger' | 'default'
	onClick: () => void
}

withDefaults(
	defineProps<{
		items: DropdownItem[]
	}>(),
	{
		items: () => [],
	},
);

const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const close = () => {
	isOpen.value = false;
};

const toggle = () => {
	isOpen.value = !isOpen.value;
};

const handleItemClick = (item: DropdownItem) => {
	item.onClick();
	close();
};

const handleClickOutside = (event: MouseEvent) => {
	if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
		close();
	}
};

const handleEscape = (event: KeyboardEvent) => {
	if (event.key === 'Escape') {
		close();
	}
};

watch(isOpen, (open) => {
	if (open) {
		document.addEventListener('click', handleClickOutside, { capture: true });
		document.addEventListener('keydown', handleEscape);
	} else {
		document.removeEventListener('click', handleClickOutside, { capture: true });
		document.removeEventListener('keydown', handleEscape);
	}
});

onUnmounted(() => {
	document.removeEventListener('click', handleClickOutside, { capture: true });
	document.removeEventListener('keydown', handleEscape);
});
</script>

<template>
	<div ref="containerRef" class="app-dropdown">
		<button
			type="button"
			class="app-dropdown__trigger"
			aria-haspopup="menu"
			:aria-expanded="isOpen"
			aria-label="Действия"
			@click="toggle"
		>
			<span class="app-dropdown__icon" aria-hidden="true">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="6" r="1.5" />
					<circle cx="12" cy="12" r="1.5" />
					<circle cx="12" cy="18" r="1.5" />
				</svg>
			</span>
		</button>
		<Transition name="dropdown">
			<div v-show="isOpen" class="app-dropdown__menu" role="menu">
				<button
					v-for="item in items"
					:key="item.id"
					type="button"
					role="menuitem"
					:class="['app-dropdown__item', `app-dropdown__item--${item.type ?? 'default'}`]"
					@click="handleItemClick(item)"
				>
					{{ item.label }}
				</button>
			</div>
		</Transition>
	</div>
</template>

<style scoped lang="scss">
@import '@/assets/scss/variables.scss';

.app-dropdown {
	position: relative;
	display: inline-block;
}

.app-dropdown__trigger {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	padding: 0;
	background: $bg-elevated;
	border: 1px solid $border-light;
	border-radius: $radius;
	color: $text-primary;
	cursor: pointer;
	transition: background-color $transition-fast, border-color $transition-fast, color $transition-fast;

	&:hover {
		background: $bg-subtle;
		border-color: $border-medium;
	}

	&:focus-visible {
		outline: 2px solid $border-focus;
		outline-offset: 2px;
	}
}

.app-dropdown__icon {
	display: flex;
	align-items: center;
	justify-content: center;
}

.app-dropdown__menu {
	position: absolute;
	right: 0;
	top: 100%;
	z-index: 100;
	min-width: 160px;
	margin-top: $spacing-xs;
	padding: $spacing-xs;
	background: $bg-elevated;
	border: 1px solid $border-light;
	border-radius: $radius;
	box-shadow: $shadow-card;
}

.app-dropdown__item {
	display: block;
	width: 100%;
	padding: $spacing-sm $spacing-md;
	text-align: left;
	font-family: $font-primary;
	font-size: $font-size-sm;
	font-weight: $font-weight-normal;
	color: $text-primary;
	background: transparent;
	border: none;
	border-radius: $radius-sm;
	cursor: pointer;
	transition: background-color $transition-fast, color $transition-fast;

	&:hover {
		background: $bg-subtle;
	}

	&--primary {
		color: $primary-color;

		&:hover {
			background: $primary-light;
		}
	}

	&--danger {
		color: $danger;

		&:hover {
			background: $warning-light;
		}
	}
}

.dropdown-enter-active,
.dropdown-leave-active {
	transition: opacity $transition-fast, transform $transition-fast;
}

.dropdown-enter-from,
.dropdown-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}
</style>
