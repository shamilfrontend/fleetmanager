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
import { useAuthStore } from '@/stores/auth';
import { cardsApi } from '@/api/cards';
import { employeesApi } from '@/api/employees';
import { carsApi } from '@/api/cars';
import { toast } from '@/utils/toast';
import { getApiErrorMessage } from '@/utils/apiError';
import { runBulkInBatches } from '@/utils/runBulkInBatches';
import { filterData } from '@/utils/filter';
import { exportToCSV, exportToExcel } from '@/utils/export';
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
	{ key: 'card_number', label: 'Номер карты' },
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

onMounted(async () => {
	await loadFilterData();
	await fetchCards();
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
			<div class="filters card">
				<h3>Фильтры</h3>
				<div class="filters-grid">
					<div class="form-group">
						<label>Поиск</label>
						<SearchInput v-model="searchQuery" placeholder="Поиск по номеру карты..." />
					</div>
					<div class="form-group">
						<label>Статус</label>
						<select v-model="filters.status" class="form-input">
							<option value="">Все</option>
							<option value="active">Активна</option>
							<option value="blocked">Заблокирована</option>
							<option value="expired">Истекла</option>
						</select>
					</div>
					<div class="form-group">
						<label>Тип</label>
						<select v-model="filters.type" class="form-input">
							<option value="">Все</option>
							<option value="fuel">Топливная</option>
							<option value="service">Сервисная</option>
						</select>
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
					<select id="card-type" v-model="formData.type" required class="form-input">
						<option value="fuel">Топливная</option>
						<option value="service">Сервисная</option>
					</select>
				</FormField>
				<FormField label="Баланс" required field-id="card-balance">
					<input id="card-balance" v-model.number="formData.balance" type="number" required class="form-input" />
				</FormField>
				<FormField label="Лимит" required field-id="card-limit">
					<input id="card-limit" v-model.number="formData.limit" type="number" required class="form-input" />
				</FormField>
				<FormField label="Статус" required field-id="card-status">
					<select id="card-status" v-model="formData.status" required class="form-input">
						<option value="active">Активна</option>
						<option value="blocked">Заблокирована</option>
						<option value="expired">Истекла</option>
					</select>
				</FormField>
				<FormField label="Привязать к сотруднику" field-id="card-assigned_to">
					<select id="card-assigned_to" v-model="formData.assigned_to" class="form-input">
						<option :value="undefined">Не привязана</option>
						<option v-for="emp in employees" :key="emp._id" :value="emp._id">
							{{ emp.full_name }} ({{ emp.position }})
						</option>
					</select>
				</FormField>
				<FormField label="Привязать к автомобилю" field-id="card-assigned_car">
					<select id="card-assigned_car" v-model="formData.assigned_car" class="form-input">
						<option :value="undefined">Не привязана</option>
						<option v-for="car in cars" :key="car._id" :value="car._id">
							{{ car.brand }} {{ car.model }} ({{ car.plate_number }})
						</option>
					</select>
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
					<select id="card-bulk-status" v-model="bulkStatusForm.status" class="form-input" required>
						<option value="active">Активна</option>
						<option value="blocked">Заблокирована</option>
						<option value="expired">Истекла</option>
					</select>
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
	color: #666;
	background: white;
	border-radius: $border-radius;
	box-shadow: $shadow-sm;
}

.table-controls,
.filters {
	margin-bottom: $spacing-lg;
	padding: $spacing-lg;

	h3 {
		margin-bottom: $spacing-md;
		font-size: $font-size-lg;
		color: $text-primary;
	}
}

.filters-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: $spacing-md;
	margin-bottom: $spacing-md;
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
