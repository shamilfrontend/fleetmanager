<script setup lang="ts">
import {
	computed, onBeforeUnmount, onMounted, ref,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import Confirm from '@/components/common/Confirm.vue';
import { useConfirm } from '@/composables/useConfirm';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const confirm = useConfirm();

const searchQuery = ref('');
const searchInput = ref<HTMLInputElement | null>(null);
const isUserMenuOpen = ref(false);

const pageTitle = computed(() => {
	const titles: Record<string, string> = {
		'/': 'Дашборд',
		'/cars': 'Гараж',
		'/employees': 'Сотрудники',
		'/cards': 'Топливные карты',
		'/transactions': 'Транзакции',
		'/analytics': 'Аналитика',
		'/settings': 'Настройки',
	};
	return titles[route.path] || 'FleetManager';
});

const roleLabel = computed(() => {
	const labels: Record<string, string> = {
		admin: 'Администратор',
		manager: 'Менеджер',
		driver: 'Водитель',
	};
	return labels[authStore.user?.role || ''] || '';
});

const userInitials = computed(() => {
	const email = authStore.user?.email || '';
	const part = email.split('@')[0] || 'U';
	if (part.length >= 2) return (part[0] + part[1]).toUpperCase();
	return part.slice(0, 2).toUpperCase() || '?';
});

const openLogoutConfirm = () => {
	confirm.openConfirm('Вы уверены, что хотите выйти?', {
		title: 'Выход из системы',
		confirmLabel: 'Выйти',
		variant: 'primary',
		onConfirm: async () => {
			await authStore.logout();
			router.push('/login');
		},
	});
};

const handleGlobalKeydown = (event: KeyboardEvent) => {
	if ((event.ctrlKey || event.metaKey) && (event.key === 'k' || event.key === 'K')) {
		event.preventDefault();
		if (searchInput.value) {
			searchInput.value.focus();
		}
	}
};

const closeUserMenu = () => {
	isUserMenuOpen.value = false;
};

onMounted(() => {
	window.addEventListener('keydown', handleGlobalKeydown);
});

onBeforeUnmount(() => {
	window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
	<header class="header">
		<div class="header-content">
			<div class="header-left">
				<h1 class="page-title">{{ pageTitle }}</h1>
				<div class="global-search">
					<span class="global-search__icon" aria-hidden="true">
						<!-- simple search icon -->
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="11" cy="11" r="7" />
							<line x1="16.65" y1="16.65" x2="21" y2="21" />
						</svg>
					</span>
					<input
						ref="searchInput"
						v-model="searchQuery"
						type="search"
						class="global-search__input"
						placeholder="Поиск (Ctrl + K)"
					>
				</div>
			</div>
			<div class="header-right">
				<button type="button" class="icon-btn" aria-label="Сменить тему">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
					</svg>
				</button>
				<button type="button" class="icon-btn" aria-label="Быстрые действия">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="3" width="7" height="7" />
						<rect x="14" y="3" width="7" height="7" />
						<rect x="14" y="14" width="7" height="7" />
						<rect x="3" y="14" width="7" height="7" />
					</svg>
				</button>
				<button type="button" class="icon-btn" aria-label="Уведомления">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
						<path d="M13.73 21a2 2 0 0 1-3.46 0" />
					</svg>
				</button>

				<div class="user-menu">
					<button
						type="button"
						class="user-trigger"
						@click="isUserMenuOpen = !isUserMenuOpen"
					>
						<div class="user-avatar" :title="authStore.user?.email">
							{{ userInitials }}
						</div>
						<div class="user-info">
							<span class="user-name">{{ authStore.user?.email }}</span>
							<span class="user-role">{{ roleLabel }}</span>
						</div>
						<span class="user-trigger__chevron" aria-hidden="true">▾</span>
					</button>
					<div v-if="isUserMenuOpen" class="user-dropdown">
						<button type="button" class="user-dropdown__item" @click="closeUserMenu">
							Профиль
						</button>
						<button type="button" class="user-dropdown__item" @click="router.push({ name: 'Settings' }); closeUserMenu();">
							Настройки
						</button>
						<button type="button" class="user-dropdown__item user-dropdown__item--danger" @click="openLogoutConfirm">
							Выход
						</button>
					</div>
				</div>
			</div>
		</div>
		<Confirm
			v-model:is-open="confirm.isOpen"
			:title="confirm.title"
			:message="confirm.message"
			:confirm-label="confirm.confirmLabel"
			:cancel-label="confirm.cancelLabel"
			:variant="confirm.variant"
			:on-confirm="confirm.handleConfirm"
			:on-close="confirm.closeConfirm"
		/>
	</header>
</template>

<style scoped lang="scss">
@import '@/assets/scss/variables.scss';

.header {
	background: $bg-elevated;
	box-shadow: $shadow-header;
	padding: $spacing-md $spacing-lg;
	color: $text-primary;
	position: sticky;
	top: 0;
	z-index: 10;
}

.header-content {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: $spacing-lg;
}

.header-left {
	display: flex;
	align-items: center;
	gap: $spacing-lg;
	min-width: 0;
}

.page-title {
	font-size: $font-size-xl;
	font-weight: $font-weight-semibold;
	color: $text-primary;
	letter-spacing: $letter-spacing-tight;
	white-space: nowrap;
}

.global-search {
	flex: 1;
	max-width: 360px;
	display: flex;
	align-items: center;
	gap: $spacing-sm;
	padding: 6px $spacing-md;
	border-radius: 999px;
	background: $bg-subtle;
	border: 1px solid $border-light;
}

.global-search__icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	color: $text-muted;
}

.global-search__input {
	border: none;
	background: transparent;
	outline: none;
	width: 100%;
	font-size: $font-size-sm;
	font-family: $font-primary;
	color: $text-primary;

	&::placeholder {
		color: $text-muted;
	}
}

.header-right {
	display: flex;
	align-items: center;
	gap: $spacing-md;
}

.icon-btn {
	width: 32px;
	height: 32px;
	border-radius: 999px;
	border: none;
	background: transparent;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	color: $text-muted;
	transition: background-color $transition-fast, color $transition-fast, transform $transition-fast;

	&:hover {
		background: $bg-subtle;
		color: $text-primary;
	}
}

.user-menu {
	position: relative;
}

.user-trigger {
	display: inline-flex;
	align-items: center;
	gap: $spacing-sm;
	padding: 2px $spacing-md 2px 2px;
	border-radius: 999px;
	border: 1px solid $border-light;
	background: $bg-elevated;
	cursor: pointer;
}

.user-trigger__chevron {
	font-size: $font-size-xs;
	color: $text-muted;
}

.user-avatar {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: $primary-light;
	color: $primary-dark;
	font-size: $font-size-sm;
	font-weight: $font-weight-semibold;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.user-info {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
}

.user-name {
	font-weight: $font-weight-medium;
	color: $text-primary;
	font-size: $font-size-sm;
	max-width: 180px;
	overflow: hidden;
	text-overflow: ellipsis;
}

.user-role {
	font-size: $font-size-xs;
	color: $text-muted;
}

.user-dropdown {
	position: absolute;
	right: 0;
	top: calc(100% + 8px);
	min-width: 200px;
	background: $bg-elevated;
	border-radius: $radius;
	box-shadow: $shadow-card;
	border: 1px solid $border-light;
	padding: 4px 0;
	z-index: 20;
}

.user-dropdown__item {
	width: 100%;
	padding: 8px $spacing-md;
	text-align: left;
	border: none;
	background: transparent;
	font-size: $font-size-sm;
	color: $text-primary;
	cursor: pointer;
	transition: background-color $transition-fast, color $transition-fast;

	&:hover {
		background: $bg-subtle;
	}

	&--danger {
		color: $warning;
	}
}

@media (max-width: 768px) {
	.header {
		padding: $spacing-sm $spacing-md;
	}

	.header-content {
		flex-direction: column;
		align-items: stretch;
		gap: $spacing-sm;
	}

	.header-left {
		justify-content: space-between;
	}
}
</style>
