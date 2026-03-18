<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import NavIcon from '@/components/common/NavIcon.vue';

const route = useRoute();
const authStore = useAuthStore();

const isNavItemActive = (path: string) => {
	const current = route.path;
	if (current === path) return true;
	if (path === '/') return false;
	return current.startsWith(`${path}/`);
};

const navItems = computed(() => {
	const main = [
		{ path: '/', label: 'Дашборд', icon: 'dashboard' },
		{ path: '/cars', label: 'Гараж', icon: 'cars' },
		{ path: '/employees', label: 'Сотрудники', icon: 'employees' },
		{ path: '/cards', label: 'Карты', icon: 'cards' },
		{ path: '/transactions', label: 'Транзакции', icon: 'transactions' },
	];
	const analytics = authStore.isManager || authStore.isAdmin
		? [
			{ path: '/analytics', label: 'Аналитика', icon: 'analytics' },
			{ path: '/link-builder', label: 'Конструктор связей', icon: 'wrench' },
		]
		: [];
	const settings = { path: '/settings', label: 'Настройки', icon: 'settings' };
	return [...main, ...analytics, settings];
});
</script>

<template>
	<aside class="sidebar">
		<div class="sidebar-header">
			<div class="brand">
				<span class="brand-logo">FM</span>
				<span class="brand-text">FleetManager</span>
			</div>
		</div>
		<nav class="sidebar-nav">
			<div class="nav-list">
				<router-link
					v-for="item in navItems"
					:key="item.path"
					:to="item.path"
					class="nav-item"
					:class="{ active: isNavItemActive(item.path) }"
				>
					<NavIcon :name="item.icon" />
					<span class="nav-text">{{ item.label }}</span>
				</router-link>
			</div>
		</nav>
	</aside>
</template>

<style scoped lang="scss">
@import '@/assets/scss/variables.scss';

.sidebar {
	position: sticky;
	top: 0;
	height: 100vh;
	align-self: start;
	width: 270px;
	background: linear-gradient(180deg, $sidebar-bg 0%, $sidebar-bg-alt 100%);
	box-shadow: $shadow-md;
	transition: width $transition-base;
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
	color: $nav-text;
}

.sidebar-header {
	padding: $spacing-lg;
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	min-height: 64px;
}

.brand {
	display: inline-flex;
	align-items: center;
	gap: $spacing-sm;
	overflow: hidden;
}

.brand-logo {
	width: 32px;
	height: 32px;
	border-radius: 12px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background: radial-gradient(circle at 0 0, #7367f0, #00cfe8);
	color: #fff;
	font-weight: $font-weight-bold;
	font-size: $font-size-sm;
}

.brand-text {
	font-size: $font-size-lg;
	font-weight: $font-weight-semibold;
	letter-spacing: $letter-spacing-tight;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.toggle-icon {
	display: inline-block;
	font-size: $font-size-sm;
	transform: rotate(180deg);
	transition: transform $transition-base;
}

.sidebar-nav {
	flex: 1;
	padding: $spacing-md 0 $spacing-lg;
	overflow-y: auto;
}

.nav-list {
	padding: 0 $spacing-md;
}

.nav-item {
	display: flex;
	align-items: center;
	padding: $spacing-sm $spacing-md;
	margin-bottom: 4px;
	border-radius: 999px;
	color: $nav-text-muted;
	text-decoration: none;
	transition: background-color $transition-fast, color $transition-fast, box-shadow $transition-fast;
	position: relative;

	&:hover {
		background: $nav-bg-hover;
		color: $nav-text;
	}

	&.active {
		color: $nav-item-active-color;
		background: $nav-item-active-bg;
		box-shadow: 0 0 0 1px rgba($nav-item-border-active, 0.5);

		&::before {
			content: '';
			position: absolute;
			left: -6px;
			top: 50%;
			transform: translateY(-50%);
			width: 4px;
			height: 24px;
			border-radius: 999px;
			background: $nav-item-border-active;
		}
	}
}

:deep(.nav-icon-svg) {
	margin-right: $spacing-md;
}

.nav-text {
	font-weight: $font-weight-medium;
	font-size: $font-size-sm;
}
</style>
