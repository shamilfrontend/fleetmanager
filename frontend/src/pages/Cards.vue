<script setup lang="ts">
import {
	ref, computed, onMounted,
} from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AppButton from '@/components/common/AppButton.vue';
import DataTable from '@/components/common/DataTable.vue';
import Modal from '@/components/common/Modal.vue';
import Confirm from '@/components/common/Confirm.vue';
import { useConfirm } from '@/composables/useConfirm';
import SearchInput from '@/components/common/SearchInput.vue';
import Pagination from '@/components/common/Pagination.vue';
import FormField from '@/components/common/FormField.vue';
import AppSelect from '@/components/common/AppSelect.vue';
import { useAuthStore } from '@/stores/auth';
import { cardsApi } from '@/api/cards';
import { employeesApi } from '@/api/employees';
import { carsApi } from '@/api/cars';
import { toast } from '@/utils/toast';
import { getApiErrorMessage } from '@/utils/apiError';
import { runBulkInBatches } from '@/utils/runBulkInBatches';
import { filterData } from '@/utils/filter';
import { exportToCSV, exportToExcel } from '@/utils/export';
import { getCardStatusLabel } from '@/utils/labels';
import { formatCardNumber, normalizeCardNumber } from '@/utils/helpers';
import type { Card, Employee, Car } from '@/types';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const confirm = useConfirm();
const cards = ref<Card[]>([]);
const totalCards = ref(0);
const currentPage = ref(1);
const pageSize = ref(25);
const employees = ref<Employee[]>([]);
const cars = ref<Car[]>([]);
const loading = ref(false);
const showModal = ref(false);
const editingCard = ref<Card | null>(null);
const searchQuery = ref('');
const filters = ref({
	status: '',
	type: '',
});
const selectedCards = ref<Card[]>([]);
const showBulkStatusModal = ref(false);
const bulkStatusForm = ref({
	status: 'active',
});
const bulkProgress = ref({ done: 0, total: 0 });
const bulkSaving = ref(false);

const BULK_BATCH_SIZE = 8;

// Статистика для карточек (Vuexy-style)
const statsActive = ref<number | null>(null);
const statsBlocked = ref<number | null>(null);
const statsExpired = ref<number | null>(null);

// Опции для селектов
const cardTypeOptions = [
	{ value: 'fuel', label: 'Топливная' },
	{ value: 'service', label: 'Сервисная' },
];
const cardStatusOptions = [
	{ value: 'active', label: 'Активна' },
	{ value: 'blocked', label: 'Заблокирована' },
	{ value: 'expired', label: 'Истекла' },
];
const filterStatusOptions = [
	{ value: '', label: 'Все' },
	...cardStatusOptions,
];
const filterTypeOptions = [
	{ value: '', label: 'Все' },
	...cardTypeOptions,
];
const employeeOptions = computed(() => [
	{ value: undefined, label: 'Не привязана' },
	...employees.value.map((e) => ({ value: e._id, label: `${e.full_name} (${e.position})` })),
]);
const carOptions = computed(() => [
	{ value: undefined, label: 'Не привязана' },
	...cars.value.map((c) => ({
		value: c._id,
		label: `${c.brand} ${c.model} (${c.plate_number})`,
	})),
]);

// Сервер уже фильтрует по статусу и типу, здесь оставляем только поиск по номеру
const filteredCards = computed(() => filterData(cards.value, searchQuery.value, ['card_number']));

const hasActiveFilters = computed(() => Boolean(searchQuery.value || filters.value.status || filters.value.type));

const resetFilters = () => {
	searchQuery.value = '';
	filters.value = {
		status: '',
		type: '',
	};
	currentPage.value = 1;
	fetchCards();
};

const clearSelection = () => {
	selectedCards.value = [];
};

const bulkChangeStatus = () => {
	if (selectedCards.value.length === 0) return;
	bulkProgress.value = { done: 0, total: 0 };
	showBulkStatusModal.value = true;
};

const handleBulkStatusSave = async () => {
	const items = [...selectedCards.value];
	const total = items.length;
	if (total === 0) return;
	bulkSaving.value = true;
	bulkProgress.value = { done: 0, total };
	try {
		await runBulkInBatches(
			items,
			BULK_BATCH_SIZE,
			(card) => cardsApi.update(card._id, { status: bulkStatusForm.value.status }),
			(done, tot) => { bulkProgress.value = { done, total: tot }; },
		);
		toast.success(`Статус изменен для ${total} карт`);
		clearSelection();
		showBulkStatusModal.value = false;
		await fetchCards();
	} catch (error: unknown) {
		toast.error(getApiErrorMessage(error));
	} finally {
		bulkSaving.value = false;
		bulkProgress.value = { done: 0, total: 0 };
	}
};

const bulkDelete = () => {
	if (selectedCards.value.length === 0) return;
	const count = selectedCards.value.length;
	confirm.openConfirm(`Удалить ${count} карт?`, {
		onConfirm: async () => {
			try {
				const items = [...selectedCards.value];
				await runBulkInBatches(items, BULK_BATCH_SIZE, (card) => cardsApi.delete(card._id));
				toast.success(`Удалено ${count} карт`);
				clearSelection();
				await fetchCards();
			} catch (error: unknown) {
				toast.error(getApiErrorMessage(error));
			}
		},
	});
};

const onPageChange = (page: number) => {
	if (page === currentPage.value) return;
	currentPage.value = page;
	fetchCards();
};

const onPageSizeChange = (size: number) => {
	if (size === pageSize.value) return;
	pageSize.value = size;
	currentPage.value = 1;
	fetchCards();
};
const formData = ref<Partial<Card>>({
	card_number: '',
	type: 'fuel',
	balance: 0,
	limit: 0,
	status: 'active',
	assigned_to: undefined,
	assigned_car: undefined,
});

const resetForm = () => {
	formData.value = {
		card_number: '',
		type: 'fuel',
		balance: 0,
		limit: 0,
		status: 'active',
		assigned_to: undefined,
		assigned_car: undefined,
	};
	editingCard.value = null;
};

const getEmployeeName = (card: Card) => {
	if (!card) return '-';

	if (typeof card.assigned_to === 'object' && card.assigned_to) {
		return card.assigned_to.full_name || '-';
	}

	if (card.assigned_to) {
		const emp = employees.value.find((e) => e._id === card.assigned_to);
		return emp?.full_name || '-';
	}

	return '-';
};

const getCarInfo = (card: Card) => {
	if (!card) return '-';

	if (typeof card.assigned_car === 'object' && card.assigned_car) {
		return `${card.assigned_car.brand || ''} ${card.assigned_car.model || ''}`.trim() || '-';
	}

	if (card.assigned_car) {
		const car = cars.value.find((c) => c._id === card.assigned_car);
		return car ? `${car.brand} ${car.model}` : '-';
	}

	return '-';
};

const columns = [
	{ key: 'card_number', label: 'Карта' },
	{ key: 'type', label: 'Тип' },
	{ key: 'balance', label: 'Баланс', format: 'currency' },
	{ key: 'limit', label: 'Лимит', format: 'currency' },
	{ key: 'status', label: 'Статус' },
	{
		key: 'assigned_to',
		label: 'Сотрудник',
		format: 'custom' as const,
	},
	{
		key: 'assigned_car',
		label: 'Автомобиль',
		format: 'custom' as const,
	},
];

const tableActions = [
	{
		name: 'view',
		label: 'Просмотр',
		handler: (row: Card) => {
			if (row._id) router.push(`/cards/${row._id}`);
		},
	},
	{
		name: 'edit',
		label: 'Редактировать',
		handler: (row: Card) => {
			editingCard.value = row;
			const r = row as Card & { assigned_to?: string | { _id?: string }; assigned_car?: string | { _id?: string } };
			formData.value = {
				...row,
				assigned_to: (typeof r.assigned_to === 'object' && r.assigned_to && '_id' in r.assigned_to ? r.assigned_to._id : r.assigned_to) ?? '',
				assigned_car: (typeof r.assigned_car === 'object' && r.assigned_car && '_id' in r.assigned_car ? r.assigned_car._id : r.assigned_car) ?? '',
			};
			showModal.value = true;
		},
	},
	{
		name: 'delete',
		label: 'Удалить',
		type: 'danger' as const,
		handler: (row: Card) => {
			confirm.openConfirm('Удалить карту?', {
				onConfirm: async () => {
					try {
						await cardsApi.delete(row._id);
						toast.success('Карта успешно удалена');
						await fetchCards();
					} catch (error: unknown) {
						toast.error(getApiErrorMessage(error));
					}
				},
			});
		},
	},
];

const fetchCards = async () => {
	loading.value = true;
	try {
		const {
			data, total, page, limit,
		} = await cardsApi.getAll({
			page: currentPage.value,
			limit: pageSize.value,
			status: filters.value.status || undefined,
			type: (filters.value.type || undefined) as 'fuel' | 'service' | undefined,
		});
		cards.value = data;
		totalCards.value = total;
		currentPage.value = page;
		pageSize.value = limit;
	} catch (error) {
		console.error('Ошибка загрузки карт:', error);
	} finally {
		loading.value = false;
	}
};

const loadFilterData = async () => {
	try {
		const [employeesResponse, carsResponse] = await Promise.all([
			employeesApi.getAll({ page: 1, limit: 1000 }),
			carsApi.getAll({ page: 1, limit: 1000 }),
		]);
		employees.value = employeesResponse.data;
		cars.value = carsResponse.data;
	} catch (error) {
		console.error('Ошибка загрузки данных для привязки:', error);
	}
};

const handleSave = async () => {
	try {
		// Преобразуем пустые строки в undefined
		const dataToSave = {
			...formData.value,
			card_number: normalizeCardNumber(formData.value.card_number ?? ''),
			assigned_to: formData.value.assigned_to || undefined,
			assigned_car: formData.value.assigned_car || undefined,
		};

		if (editingCard.value) {
			await cardsApi.update(editingCard.value._id, dataToSave);
		} else {
			await cardsApi.create(dataToSave);
		}
		resetForm();
		showModal.value = false;
		await fetchCards();
	} catch (error) {
		console.error('Ошибка сохранения карты:', error);
	}
};

const handleExport = async (format: 'csv' | 'excel') => {
	try {
		if (format === 'csv') {
			exportToCSV(filteredCards.value, 'карты', columns);
		} else {
			await exportToExcel(filteredCards.value, 'карты', columns);
		}
		toast.success('Данные успешно экспортированы');
	} catch (error) {
		toast.error('Ошибка экспорта данных');
	}
};

const handlePrint = () => {
	if (typeof window !== 'undefined') window.print();
};

const loadStats = async () => {
	try {
		const [activeRes, blockedRes, expiredRes] = await Promise.all([
			cardsApi.getAll({ status: 'active', page: 1, limit: 1 }),
			cardsApi.getAll({ status: 'blocked', page: 1, limit: 1 }),
			cardsApi.getAll({ status: 'expired', page: 1, limit: 1 }),
		]);
		statsActive.value = activeRes.total;
		statsBlocked.value = blockedRes.total;
		statsExpired.value = expiredRes.total;
	} catch {
		statsActive.value = 0;
		statsBlocked.value = 0;
		statsExpired.value = 0;
	}
};

onMounted(async () => {
	await loadFilterData();
	await fetchCards();
	await loadStats();
	const editId = route.query.edit as string;
	if (editId) {
		const cardItem = cards.value.find((c) => c._id === editId);
		if (cardItem) {
			editingCard.value = cardItem;
			const c = cardItem as Card & { assigned_to?: string | { _id?: string }; assigned_car?: string | { _id?: string } };
			formData.value = {
				...cardItem,
				assigned_to: (typeof c.assigned_to === 'object' && c.assigned_to && '_id' in c.assigned_to ? c.assigned_to._id : c.assigned_to) ?? '',
				assigned_car: (typeof c.assigned_car === 'object' && c.assigned_car && '_id' in c.assigned_car ? c.assigned_car._id : c.assigned_car) ?? '',
			};
			showModal.value = true;
		}
		window.history.replaceState({}, '', window.location.pathname);
	}
});
</script>

<template>
	<div class="cards-page">
		<div class="page-header">
			<h1>Топливные карты</h1>
			<div class="header-actions">
				<div class="export-buttons">
					<AppButton variant="secondary" @click="handlePrint">Печать</AppButton>
					<AppButton variant="secondary" @click="handleExport('csv')">Экспорт CSV</AppButton>
					<AppButton variant="secondary" @click="handleExport('excel')">Экспорт Excel</AppButton>
				</div>
				<AppButton
					v-if="authStore.isManager || authStore.isAdmin"
					variant="primary"
					@click="() => { resetForm(); showModal = true }"
				>
					Добавить карту
				</AppButton>
			</div>
		</div>

		<div v-if="loading" class="loading" role="status" aria-live="polite" aria-label="Загрузка данных">Загрузка...</div>
		<template v-else>
			<div class="stats-grid">
				<div class="stat-card card">
					<div class="stat-icon" aria-hidden="true">💳</div>
					<div class="stat-info">
						<h3 class="stat-value">{{ totalCards }}</h3>
						<p class="stat-label">Всего карт</p>
						<p class="stat-detail">В системе</p>
					</div>
				</div>
				<div class="stat-card card">
					<div class="stat-icon" aria-hidden="true">✓</div>
					<div class="stat-info">
						<h3 class="stat-value">{{ statsActive !== null ? statsActive : '—' }}</h3>
						<p class="stat-label">Активные</p>
						<p class="stat-detail">Доступны к использованию</p>
					</div>
				</div>
				<div class="stat-card card">
					<div class="stat-icon" aria-hidden="true">🔒</div>
					<div class="stat-info">
						<h3 class="stat-value">{{ statsBlocked !== null ? statsBlocked : '—' }}</h3>
						<p class="stat-label">Заблокированы</p>
						<p class="stat-detail">Временно недоступны</p>
					</div>
				</div>
				<div class="stat-card card">
					<div class="stat-icon" aria-hidden="true">○</div>
					<div class="stat-info">
						<h3 class="stat-value">{{ statsExpired !== null ? statsExpired : '—' }}</h3>
						<p class="stat-label">Истекли</p>
						<p class="stat-detail">Срок действия</p>
					</div>
				</div>
			</div>
			<div class="filters card">
				<h4 class="filters-title">Фильтры</h4>
				<div class="filters-grid">
					<div class="form-group">
						<label>Поиск</label>
						<SearchInput v-model="searchQuery" placeholder="Поиск по номеру карты..." />
					</div>
					<div class="form-group">
						<label>Статус</label>
						<AppSelect
							v-model="filters.status"
							:options="filterStatusOptions"
							placeholder="Все"
						/>
					</div>
					<div class="form-group">
						<label>Тип</label>
						<AppSelect
							v-model="filters.type"
							:options="filterTypeOptions"
							placeholder="Все"
						/>
					</div>
				</div>
				<div class="filters-actions">
					<AppButton variant="secondary" @click="resetFilters">Сбросить фильтры</AppButton>
				</div>
			</div>
			<div v-if="selectedCards.length > 0" class="bulk-actions card">
				<div class="bulk-info">
					Выбрано: {{ selectedCards.length }}
				</div>
				<div class="bulk-buttons">
					<AppButton size="sm" variant="secondary" @click="bulkChangeStatus">Изменить статус</AppButton>
					<AppButton size="sm" variant="danger" @click="bulkDelete">Удалить</AppButton>
					<AppButton size="sm" variant="secondary" @click="clearSelection">Снять выделение</AppButton>
				</div>
			</div>
			<DataTable
				:data="filteredCards"
				:columns="columns"
				:actions="tableActions"
				:selectable="true"
				:selected-rows="selectedCards"
				@update:selected-rows="selectedCards = $event"
			>
				<template #cell-card_number="{ row }">
					<div class="entity-cell">
						<span class="entity-icon" aria-hidden="true">💳</span>
						<span class="entity-name">{{ formatCardNumber((row as Card).card_number) }}</span>
					</div>
				</template>
				<template #cell-status="{ value }">
					<span class="status-badge" :class="value === 'active' ? 'status-active' : value === 'blocked' ? 'status-blocked' : 'status-expired'">
						{{ getCardStatusLabel(value) }}
					</span>
				</template>
				<template #empty>
					<div class="table-empty-state">
						<p class="table-empty-state__text">Нет карт</p>
						<p class="table-empty-state__hint">Добавьте первую топливную или сервисную карту</p>
						<AppButton
							v-if="authStore.isManager || authStore.isAdmin"
							variant="primary"
							@click="resetForm(); showModal = true"
						>
							Добавить карту
						</AppButton>
					</div>
				</template>
				<template #cell-assigned_to="{ row }">
					{{ getEmployeeName(row) }}
				</template>
				<template #cell-assigned_car="{ row }">
					{{ getCarInfo(row) }}
				</template>
			</DataTable>
			<Pagination
				v-if="totalCards > 0"
				:current-page="currentPage"
				:page-size="pageSize"
				:total="totalCards"
				@update:currentPage="onPageChange"
				@update:pageSize="onPageSizeChange"
			/>
			<div v-if="filteredCards.length === 0 && (searchQuery || hasActiveFilters)" class="no-results">
				<p>Нет результатов по заданным фильтрам</p>
				<AppButton size="sm" variant="secondary" @click="resetFilters">Сбросить фильтры</AppButton>
			</div>
		</template>

		<Modal
			v-model:is-open="showModal"
			:title="editingCard ? 'Редактировать карту' : 'Добавить карту'"
			@confirm="handleSave"
			@update:is-open="(val) => { if (!val) resetForm() }"
		>
			<form class="card-form">
				<FormField label="Номер карты" required field-id="card-card_number">
					<input id="card-card_number" v-model="formData.card_number" required class="form-input" />
				</FormField>
				<FormField label="Тип" required field-id="card-type">
					<AppSelect
						field-id="card-type"
						v-model="formData.type"
						:options="cardTypeOptions"
						placeholder="Выберите тип"
					/>
				</FormField>
				<FormField label="Баланс" required field-id="card-balance">
					<input id="card-balance" v-model.number="formData.balance" type="number" required class="form-input" />
				</FormField>
				<FormField label="Лимит" required field-id="card-limit">
					<input id="card-limit" v-model.number="formData.limit" type="number" required class="form-input" />
				</FormField>
				<FormField label="Статус" required field-id="card-status">
					<AppSelect
						field-id="card-status"
						v-model="formData.status"
						:options="cardStatusOptions"
						placeholder="Выберите статус"
					/>
				</FormField>
				<FormField label="Привязать к сотруднику" field-id="card-assigned_to">
					<AppSelect
						field-id="card-assigned_to"
						v-model="formData.assigned_to"
						:options="employeeOptions"
						placeholder="Не привязана"
						clearable
						searchable
					/>
				</FormField>
				<FormField label="Привязать к автомобилю" field-id="card-assigned_car">
					<AppSelect
						field-id="card-assigned_car"
						v-model="formData.assigned_car"
						:options="carOptions"
						placeholder="Не привязана"
						clearable
						searchable
					/>
				</FormField>
				<FormField v-if="formData.expiry_date !== undefined" label="Срок действия" field-id="card-expiry_date">
					<input id="card-expiry_date" v-model="formData.expiry_date" type="date" class="form-input" />
				</FormField>
			</form>
		</Modal>

		<!-- Модальное окно массового изменения статуса -->
		<Modal
			v-model:is-open="showBulkStatusModal"
			title="Изменить статус"
			:confirm-disabled="bulkSaving"
			@confirm="handleBulkStatusSave"
			@update:is-open="(val) => { if (!val) { bulkStatusForm.status = 'active'; bulkProgress.value = { done: 0, total: 0 }; } }"
		>
			<form class="bulk-status-form">
				<FormField label="Новый статус" required field-id="card-bulk-status">
					<AppSelect
						field-id="card-bulk-status"
						v-model="bulkStatusForm.status"
						:options="cardStatusOptions"
						placeholder="Выберите статус"
					/>
				</FormField>
				<p class="form-hint">
					Будет изменен статус для {{ selectedCards.length }} карт
				</p>
				<p v-if="bulkProgress.total > 0" class="bulk-progress">
					Обновлено {{ bulkProgress.done }} из {{ bulkProgress.total }}
				</p>
			</form>
		</Modal>
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
	</div>
</template>

<style scoped lang="scss">
@import '@/assets/scss/variables.scss';

.page-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: $spacing-lg;
}

.header-actions {
	display: flex;
	gap: $spacing-md;
}

.export-buttons {
	display: flex;
	gap: $spacing-sm;
}

.loading {
	padding: $spacing-lg;
	text-align: center;
}

.stats-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
	gap: $spacing-md;
	margin-bottom: $spacing-lg;
}

.stat-card {
	display: flex;
	align-items: center;
	gap: $spacing-md;
	padding: $spacing-lg;
}

.stat-icon {
	font-size: $font-size-2xl;
	width: 48px;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba($primary-color, 0.1);
	border-radius: 50%;
	color: $primary-color;
}

.stat-value {
	font-size: $font-size-2xl;
	font-weight: $font-weight-semibold;
	color: $text-primary;
	letter-spacing: $letter-spacing-tight;
	margin: 0 0 $spacing-xs 0;
}

.stat-label {
	color: $text-muted;
	font-size: $font-size-sm;
	margin: 0;
}

.stat-detail {
	color: $text-secondary;
	font-size: $font-size-xs;
	margin: $spacing-xs 0 0 0;
}

.filters {
	margin-bottom: $spacing-lg;
	padding: $spacing-md $spacing-lg;
}

.filters-title {
	margin: 0 0 $spacing-md 0;
	font-size: $font-size-base;
	font-weight: $font-weight-semibold;
	color: $text-primary;
}

.card-form {
	display: flex;
	flex-direction: column;
	gap: $spacing-md;
}

.form-group {
	display: flex;
	flex-direction: column;
	gap: $spacing-xs;
}

label {
	font-weight: 500;
	color: $text-primary;
}

.form-input {
	padding: $spacing-sm $spacing-md;
	border: 1px solid #e0e0e0;
	border-radius: $border-radius;
	font-size: $font-size-base;
	font-family: $font-primary;

	&:focus {
		outline: none;
		border-color: $primary-color;
	}
}

.table-controls {
	margin-bottom: $spacing-md;
	padding: $spacing-md;
}

.no-results {
	padding: $spacing-xl;
	text-align: center;
	color: $text-secondary;
	background: $bg-elevated;
	border-radius: $border-radius;
	box-shadow: $shadow-sm;
}

.entity-cell {
	display: flex;
	align-items: center;
	gap: $spacing-md;
}

.entity-icon {
	font-size: $font-size-lg;
	width: 36px;
	height: 36px;
	min-width: 36px;
	border-radius: 50%;
	background: $primary-light;
	color: $primary-dark;
	display: flex;
	align-items: center;
	justify-content: center;
}

.entity-name {
	font-weight: $font-weight-medium;
	color: $text-primary;
}

.status-badge {
	display: inline-block;
	padding: $spacing-xs $spacing-sm;
	border-radius: $radius-sm;
	font-size: $font-size-xs;
	font-weight: $font-weight-medium;

	&.status-active {
		background: $success-light;
		color: $success;
	}
	&.status-blocked {
		background: $warning-light;
		color: $warning;
	}
	&.status-expired {
		background: $bg-subtle;
		color: $text-muted;
	}
}

.table-empty-state {
	padding: $spacing-xl;
	text-align: center;

	&__text {
		font-size: $font-size-base;
		font-weight: $font-weight-medium;
		color: $text-primary;
		margin: 0 0 $spacing-xs 0;
	}

	&__hint {
		font-size: $font-size-sm;
		color: $text-muted;
		margin: 0 0 $spacing-md 0;
	}
}

.table-controls {
	margin-bottom: $spacing-md;
	padding: $spacing-md;
}

.filters-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: $spacing-md;
	margin-bottom: $spacing-sm;
}

.filters-actions {
	display: flex;
	gap: $spacing-md;
	justify-content: flex-end;
}

.bulk-actions {
	margin-bottom: $spacing-md;
	padding: $spacing-md;
	display: flex;
	justify-content: space-between;
	align-items: center;
	background: rgba($primary-color, 0.05);
	border-left: 3px solid $primary-color;
}

.bulk-info {
	font-weight: 500;
	color: $text-primary;
}

.bulk-buttons {
	display: flex;
	gap: $spacing-sm;
}

.bulk-status-form {
	display: flex;
	flex-direction: column;
	gap: $spacing-md;
}

.form-hint {
	font-size: $font-size-sm;
	color: #666;
	margin-top: $spacing-xs;
}

.bulk-progress {
	font-size: $font-size-sm;
	color: $text-muted;
	margin-top: $spacing-sm;
}
</style>
