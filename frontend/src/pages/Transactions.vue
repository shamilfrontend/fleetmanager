<script setup lang="ts">
import {
	ref, computed, onMounted,
} from 'vue';
import AppButton from '@/components/common/AppButton.vue';
import DataTable from '@/components/common/DataTable.vue';
import Modal from '@/components/common/Modal.vue';
import Confirm from '@/components/common/Confirm.vue';
import { useConfirm } from '@/composables/useConfirm';
import Pagination from '@/components/common/Pagination.vue';
import SearchInput from '@/components/common/SearchInput.vue';
import FormField from '@/components/common/FormField.vue';
import AppSelect from '@/components/common/AppSelect.vue';
import AppDatePicker from '@/components/common/AppDatePicker.vue';
import { transactionsApi, type TransactionFilters } from '@/api/transactions';
import { employeesApi } from '@/api/employees';
import { carsApi } from '@/api/cars';
import { cardsApi } from '@/api/cards';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/utils/toast';
import { getApiErrorMessage } from '@/utils/apiError';
import { formatCardNumber } from '@/utils/helpers';
import { exportToCSV, exportToExcel } from '@/utils/export';
import { filterData } from '@/utils/filter';
import type {
	Transaction, Employee, Car, Card,
} from '@/types';

const authStore = useAuthStore();
const confirmDialog = useConfirm();
const transactions = ref<Transaction[]>([]);
const totalTransactions = ref(0);
const currentPage = ref(1);
const pageSize = ref(25);
const employees = ref<Employee[]>([]);
const cars = ref<Car[]>([]);
const cards = ref<Card[]>([]);
const loading = ref(false);
const showModal = ref(false);
const editingTransaction = ref<Transaction | null>(null);
const searchQuery = ref('');
const filters = ref<TransactionFilters>({
	dateFrom: '',
	dateTo: '',
	employeeId: '',
	carId: '',
	cardId: '',
	status: '',
});
const selectedTransactions = ref<Transaction[]>([]);
const showBulkStatusModal = ref(false);
const bulkStatusForm = ref({
	status: 'completed',
});

// Статистика для карточек (Vuexy-style)
const statsCompleted = ref<number | null>(null);
const statsPending = ref<number | null>(null);
const statsCancelled = ref<number | null>(null);

// Опции для селектов формы и фильтров
const cardOptions = computed(() =>
	cards.value.map((c) => ({
		value: c._id,
		label: `${formatCardNumber(c.card_number)} (${c.type === 'fuel' ? 'Топливная' : 'Сервисная'})`,
	})));
const employeeOptions = computed(() =>
	employees.value.map((e) => ({ value: e._id, label: e.full_name })));
const carOptions = computed(() =>
	cars.value.map((c) => ({
		value: c._id,
		label: `${c.brand} ${c.model} (${c.plate_number})`,
	})));
const filterEmployeeOptions = computed(() => [
	{ value: '', label: 'Все' },
	...employeeOptions.value,
]);
const filterCarOptions = computed(() => [
	{ value: '', label: 'Все' },
	...carOptions.value,
]);
const filterCardOptions = computed(() => [
	{ value: '', label: 'Все' },
	...cardOptions.value,
]);
const fuelTypeOptions = [
	{ value: 'АИ-95', label: 'АИ-95' },
	{ value: 'АИ-92', label: 'АИ-92' },
	{ value: 'Дизель', label: 'Дизель' },
	{ value: 'Газ', label: 'Газ' },
];
const statusOptions = [
	{ value: 'completed', label: 'Завершена' },
	{ value: 'pending', label: 'В ожидании' },
	{ value: 'cancelled', label: 'Отменена' },
];
const filterStatusOptions = [
	{ value: '', label: 'Все' },
	...statusOptions,
];

// Сервер фильтрует по статусу, сотруднику, авто, карте и датам.
// Здесь оставляем только текстовый поиск по уже полученной странице.
const filteredTransactions = computed(() => filterData(transactions.value, searchQuery.value, ['amount', 'location', 'fuel_type']));

const onPageChange = (page: number) => {
	if (page === currentPage.value) return;
	currentPage.value = page;
	fetchTransactions();
};

const onPageSizeChange = (size: number) => {
	if (size === pageSize.value) return;
	pageSize.value = size;
	currentPage.value = 1;
	fetchTransactions();
};

const formData = ref<Partial<Transaction>>({
	amount: 0,
	volume: 0,
	fuel_type: '',
	location: '',
	odometer: 0,
	date: new Date().toISOString().slice(0, 16),
	status: 'completed',
	card_id: '',
	employee_id: '',
	car_id: '',
});

const resetForm = () => {
	formData.value = {
		amount: 0,
		volume: 0,
		fuel_type: '',
		location: '',
		odometer: 0,
		date: new Date().toISOString().slice(0, 16),
		status: 'completed',
		card_id: '',
		employee_id: '',
		car_id: '',
	};
	editingTransaction.value = null;
};

const columns = [
	{ key: 'date', label: 'Дата', format: 'date' },
	{ key: 'amount', label: 'Сумма', format: 'currency' },
	{ key: 'volume', label: 'Объем', format: 'number' },
	{ key: 'fuel_type', label: 'Тип топлива' },
	{ key: 'location', label: 'Место' },
	{ key: 'status', label: 'Статус' },
];

const tableActions = [
	{
		name: 'edit',
		label: 'Редактировать',
		handler: (row: Transaction) => {
			editingTransaction.value = row;
			formData.value = {
				amount: row.amount,
				volume: row.volume,
				fuel_type: row.fuel_type,
				location: row.location,
				odometer: row.odometer,
				date: new Date(row.date).toISOString().slice(0, 16),
				status: row.status,
				card_id: typeof row.card_id === 'string' ? row.card_id : row.card_id?._id || '',
				employee_id: typeof row.employee_id === 'string' ? row.employee_id : row.employee_id?._id || '',
				car_id: typeof row.car_id === 'string' ? row.car_id : row.car_id?._id || '',
			};
			showModal.value = true;
		},
	},
	{
		name: 'delete',
		label: 'Удалить',
		type: 'danger' as const,
		handler: (row: Transaction) => {
			confirmDialog.openConfirm('Удалить транзакцию?', {
				onConfirm: async () => {
					try {
						await transactionsApi.delete(row._id);
						toast.success('Транзакция успешно удалена');
						await fetchTransactions();
					} catch (error: unknown) {
						toast.error(getApiErrorMessage(error));
					}
				},
			});
		},
	},
];

const fetchTransactions = async () => {
	loading.value = true;
	try {
		// Очищаем пустые фильтры
		const activeFilters: TransactionFilters = {};
		if (filters.value.dateFrom) activeFilters.dateFrom = filters.value.dateFrom;
		if (filters.value.dateTo) activeFilters.dateTo = filters.value.dateTo;
		if (filters.value.employeeId) activeFilters.employeeId = filters.value.employeeId;
		if (filters.value.carId) activeFilters.carId = filters.value.carId;
		if (filters.value.cardId) activeFilters.cardId = filters.value.cardId;
		if (filters.value.status) activeFilters.status = filters.value.status;

		activeFilters.page = currentPage.value;
		activeFilters.limit = pageSize.value;

		const {
			data, total, page, limit,
		} = await transactionsApi.getAll(activeFilters);
		transactions.value = data;
		totalTransactions.value = total;
		currentPage.value = page;
		pageSize.value = limit;
	} catch (error) {
		console.error('Ошибка загрузки транзакций:', error);
	} finally {
		loading.value = false;
	}
};

const applyFilters = () => {
	fetchTransactions();
};

const resetFilters = () => {
	searchQuery.value = '';
	filters.value = {
		dateFrom: '',
		dateTo: '',
		employeeId: '',
		carId: '',
		cardId: '',
		status: '',
	};
	currentPage.value = 1;
	fetchTransactions();
};

const clearSelection = () => {
	selectedTransactions.value = [];
};

const bulkChangeStatus = () => {
	if (selectedTransactions.value.length === 0) return;
	showBulkStatusModal.value = true;
};

const handleBulkStatusSave = async () => {
	try {
		for (const transaction of selectedTransactions.value) {
			await transactionsApi.update(transaction._id, { status: bulkStatusForm.value.status });
		}
		toast.success(`Статус изменен для ${selectedTransactions.value.length} транзакций`);
		showBulkStatusModal.value = false;
		selectedTransactions.value = [];
		await fetchTransactions();
	} catch (error: unknown) {
		toast.error(getApiErrorMessage(error));
	}
};

const bulkDelete = () => {
	if (selectedTransactions.value.length === 0) return;
	const count = selectedTransactions.value.length;
	confirmDialog.openConfirm(`Удалить ${count} транзакций?`, {
		onConfirm: async () => {
			try {
				for (const transaction of selectedTransactions.value) {
					await transactionsApi.delete(transaction._id);
				}
				toast.success(`Удалено ${count} транзакций`);
				selectedTransactions.value = [];
				await fetchTransactions();
			} catch (error: unknown) {
				toast.error(getApiErrorMessage(error));
			}
		},
	});
};

const loadFilterData = async () => {
	try {
		const [employeesResponse, carsResponse, cardsResponse] = await Promise.all([
			employeesApi.getAll({ page: 1, limit: 1000 }),
			carsApi.getAll({ page: 1, limit: 1000 }),
			cardsApi.getAll({ page: 1, limit: 1000 }),
		]);
		employees.value = employeesResponse.data;
		cars.value = carsResponse.data;
		cards.value = cardsResponse.data;
	} catch (error) {
		console.error('Ошибка загрузки данных для фильтров:', error);
	}
};

const handleSave = async () => {
	try {
		if (editingTransaction.value) {
			await transactionsApi.update(editingTransaction.value._id, formData.value);
			toast.success('Транзакция успешно обновлена');
		} else {
			await transactionsApi.create(formData.value);
			toast.success('Транзакция успешно создана');
		}
		resetForm();
		showModal.value = false;
		await fetchTransactions();
	} catch (error: unknown) {
		toast.error(getApiErrorMessage(error));
	}
};

const handleExport = async (format: 'csv' | 'excel') => {
	try {
		if (format === 'csv') {
			exportToCSV(filteredTransactions.value, 'транзакции', columns);
		} else {
			await exportToExcel(filteredTransactions.value, 'транзакции', columns);
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
		const [completedRes, pendingRes, cancelledRes] = await Promise.all([
			transactionsApi.getAll({ status: 'completed', page: 1, limit: 1 }),
			transactionsApi.getAll({ status: 'pending', page: 1, limit: 1 }),
			transactionsApi.getAll({ status: 'cancelled', page: 1, limit: 1 }),
		]);
		statsCompleted.value = completedRes.total;
		statsPending.value = pendingRes.total;
		statsCancelled.value = cancelledRes.total;
	} catch {
		statsCompleted.value = 0;
		statsPending.value = 0;
		statsCancelled.value = 0;
	}
};

const getTransactionStatusLabel = (status: string) => {
	const map: Record<string, string> = {
		completed: 'Завершена',
		pending: 'В ожидании',
		cancelled: 'Отменена',
	};
	return map[status] ?? status;
};

onMounted(async () => {
	await loadFilterData();
	await fetchTransactions();
	await loadStats();
});

// Загружаем данные для формы при открытии модального окна
const loadFormData = async () => {
	if (!employees.value.length || !cars.value.length || !cards.value.length) {
		await loadFilterData();
	}
};
</script>

<template>
	<div class="transactions-page">
		<div class="page-header">
			<h1>Транзакции</h1>
			<div class="header-actions">
				<div class="export-buttons">
					<AppButton variant="secondary" @click="handlePrint">Печать</AppButton>
					<AppButton variant="secondary" @click="handleExport('csv')">Экспорт CSV</AppButton>
					<AppButton variant="secondary" @click="handleExport('excel')">Экспорт Excel</AppButton>
				</div>
				<AppButton
					v-if="authStore.isManager || authStore.isAdmin"
					variant="primary"
					@click="async () => { resetForm(); await loadFormData(); showModal = true }"
				>
					Добавить транзакцию
				</AppButton>
			</div>
		</div>

		<div class="stats-grid">
			<div class="stat-card card">
				<div class="stat-icon" aria-hidden="true">📝</div>
				<div class="stat-info">
					<h3 class="stat-value">{{ totalTransactions }}</h3>
					<p class="stat-label">Всего транзакций</p>
					<p class="stat-detail">В системе</p>
				</div>
			</div>
			<div class="stat-card card">
				<div class="stat-icon" aria-hidden="true">✓</div>
				<div class="stat-info">
					<h3 class="stat-value">{{ statsCompleted !== null ? statsCompleted : '—' }}</h3>
					<p class="stat-label">Завершённые</p>
					<p class="stat-detail">Успешно проведены</p>
				</div>
			</div>
			<div class="stat-card card">
				<div class="stat-icon" aria-hidden="true">⏳</div>
				<div class="stat-info">
					<h3 class="stat-value">{{ statsPending !== null ? statsPending : '—' }}</h3>
					<p class="stat-label">В ожидании</p>
					<p class="stat-detail">Ожидают обработки</p>
				</div>
			</div>
			<div class="stat-card card">
				<div class="stat-icon" aria-hidden="true">○</div>
				<div class="stat-info">
					<h3 class="stat-value">{{ statsCancelled !== null ? statsCancelled : '—' }}</h3>
					<p class="stat-label">Отменённые</p>
					<p class="stat-detail">Отменены</p>
				</div>
			</div>
		</div>

		<div class="filters card">
			<h4 class="filters-title">Фильтры</h4>
			<div class="filters-grid">
				<div class="form-group">
					<label>Поиск</label>
					<SearchInput v-model="searchQuery" placeholder="Поиск по сумме, месту, типу топлива..." />
				</div>
				<div class="form-group">
					<label for="transactions-date-from">Дата от</label>
					<AppDatePicker
						v-model="filters.dateFrom"
						placeholder="Выберите дату"
						clearable
						field-id="transactions-date-from"
					/>
				</div>
				<div class="form-group">
					<label for="transactions-date-to">Дата до</label>
					<AppDatePicker
						v-model="filters.dateTo"
						placeholder="Выберите дату"
						clearable
						field-id="transactions-date-to"
					/>
				</div>
				<div class="form-group">
					<label>Сотрудник</label>
					<AppSelect
						v-model="filters.employeeId"
						:options="filterEmployeeOptions"
						placeholder="Все"
						searchable
					/>
				</div>
				<div class="form-group">
					<label>Автомобиль</label>
					<AppSelect
						v-model="filters.carId"
						:options="filterCarOptions"
						placeholder="Все"
						searchable
					/>
				</div>
				<div class="form-group">
					<label>Карта</label>
					<AppSelect
						v-model="filters.cardId"
						:options="filterCardOptions"
						placeholder="Все"
						searchable
					/>
				</div>
				<div class="form-group">
					<label>Статус</label>
					<AppSelect
						v-model="filters.status"
						:options="filterStatusOptions"
						placeholder="Все"
					/>
				</div>
			</div>
			<div class="filters-actions">
				<AppButton variant="primary" @click="applyFilters">Применить</AppButton>
				<AppButton variant="secondary" @click="resetFilters">Сбросить фильтры</AppButton>
			</div>
		</div>

		<div v-if="selectedTransactions.length > 0" class="bulk-actions card">
			<div class="bulk-info">
				Выбрано: {{ selectedTransactions.length }}
			</div>
			<div class="bulk-buttons">
				<AppButton size="sm" variant="secondary" @click="bulkChangeStatus">Изменить статус</AppButton>
				<AppButton size="sm" variant="danger" @click="bulkDelete">Удалить</AppButton>
				<AppButton size="sm" variant="secondary" @click="clearSelection">Снять выделение</AppButton>
			</div>
		</div>

		<div v-if="loading" class="loading" role="status" aria-live="polite" aria-label="Загрузка данных">Загрузка...</div>
		<template v-else>
			<DataTable
				:data="filteredTransactions"
				:columns="columns"
				:actions="tableActions"
				:selectable="true"
				:selected-rows="selectedTransactions"
				@update:selected-rows="selectedTransactions = $event"
			>
				<template #cell-status="{ value }">
					<span
						class="status-badge"
						:class="value === 'completed' ? 'status-completed' : value === 'pending' ? 'status-pending' : 'status-cancelled'"
					>
						{{ getTransactionStatusLabel(value) }}
					</span>
				</template>
				<template #empty>
					<div class="table-empty-state">
						<p class="table-empty-state__text">Нет транзакций</p>
						<p class="table-empty-state__hint">Транзакции появятся при использовании топливных карт</p>
						<AppButton
							v-if="authStore.isManager || authStore.isAdmin"
							variant="primary"
							@click="async () => { resetForm(); await loadFormData(); showModal = true }"
						>
							Добавить транзакцию
						</AppButton>
					</div>
				</template>
			</DataTable>
			<Pagination
				v-if="totalTransactions > 0"
				:current-page="currentPage"
				:page-size="pageSize"
				:total="totalTransactions"
				@update:currentPage="onPageChange"
				@update:pageSize="onPageSizeChange"
			/>
			<div v-if="filteredTransactions.length === 0 && searchQuery" class="no-results">
				<p>Нет результатов по поиску</p>
				<AppButton size="sm" variant="secondary" @click="searchQuery = ''">Сбросить поиск</AppButton>
			</div>
		</template>

		<Modal
			v-model:is-open="showBulkStatusModal"
			title="Изменить статус транзакций"
			@confirm="handleBulkStatusSave"
			@update:is-open="(val) => { if (!val) bulkStatusForm.status = 'completed' }"
		>
			<form class="bulk-status-form">
				<FormField label="Новый статус" required field-id="tx-bulk-status">
					<AppSelect
						field-id="tx-bulk-status"
						v-model="bulkStatusForm.status"
						:options="statusOptions"
						placeholder="Выберите статус"
					/>
				</FormField>
				<p class="form-hint">
					Будет изменен статус для {{ selectedTransactions.length }} транзакций
				</p>
			</form>
		</Modal>

		<Modal
			v-model:is-open="showModal"
			:title="editingTransaction ? 'Редактировать транзакцию' : 'Добавить транзакцию'"
			@confirm="handleSave"
			@update:is-open="(val) => { if (!val) resetForm() }"
		>
			<form class="transaction-form">
				<FormField label="Карта" required field-id="tx-card_id">
					<AppSelect
						field-id="tx-card_id"
						v-model="formData.card_id"
						:options="cardOptions"
						placeholder="Выберите карту"
						searchable
					/>
				</FormField>
				<FormField label="Сотрудник" required field-id="tx-employee_id">
					<AppSelect
						field-id="tx-employee_id"
						v-model="formData.employee_id"
						:options="employeeOptions"
						placeholder="Выберите сотрудника"
						searchable
					/>
				</FormField>
				<FormField label="Автомобиль" required field-id="tx-car_id">
					<AppSelect
						field-id="tx-car_id"
						v-model="formData.car_id"
						:options="carOptions"
						placeholder="Выберите автомобиль"
						searchable
					/>
				</FormField>
				<FormField label="Сумма" required field-id="tx-amount">
					<input id="tx-amount" v-model.number="formData.amount" type="number" step="0.01" required class="form-input" />
				</FormField>
				<FormField label="Объем (л)" required field-id="tx-volume">
					<input id="tx-volume" v-model.number="formData.volume" type="number" step="0.01" required class="form-input" />
				</FormField>
				<FormField label="Тип топлива" required field-id="tx-fuel_type">
					<AppSelect
						field-id="tx-fuel_type"
						v-model="formData.fuel_type"
						:options="fuelTypeOptions"
						placeholder="Выберите тип"
					/>
				</FormField>
				<FormField label="Место" required field-id="tx-location">
					<input id="tx-location" v-model="formData.location" required class="form-input" />
				</FormField>
				<FormField label="Пробег" required field-id="tx-odometer">
					<input id="tx-odometer" v-model.number="formData.odometer" type="number" required class="form-input" />
				</FormField>
				<FormField label="Дата" required field-id="tx-date">
					<input id="tx-date" v-model="formData.date" type="datetime-local" required class="form-input" />
				</FormField>
				<FormField label="Статус" required field-id="tx-status">
					<AppSelect
						field-id="tx-status"
						v-model="formData.status"
						:options="statusOptions"
						placeholder="Выберите статус"
					/>
				</FormField>
			</form>
		</Modal>
		<Confirm
			v-model:is-open="confirmDialog.isOpen"
			:title="confirmDialog.title"
			:message="confirmDialog.message"
			:confirm-label="confirmDialog.confirmLabel"
			:cancel-label="confirmDialog.cancelLabel"
			:variant="confirmDialog.variant"
			:on-confirm="confirmDialog.handleConfirm"
			:on-close="confirmDialog.closeConfirm"
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

.transaction-form {
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

.no-results {
	padding: $spacing-xl;
	text-align: center;
	color: $text-secondary;
	background: $bg-elevated;
	border-radius: $border-radius;
	box-shadow: $shadow-sm;
}

.status-badge {
	display: inline-block;
	padding: $spacing-xs $spacing-sm;
	border-radius: $radius-sm;
	font-size: $font-size-xs;
	font-weight: $font-weight-medium;

	&.status-completed {
		background: $success-light;
		color: $success;
	}
	&.status-pending {
		background: $warning-light;
		color: $warning-orange;
	}
	&.status-cancelled {
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
</style>
