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
import { transactionsApi, type TransactionFilters } from '@/api/transactions';
import { employeesApi } from '@/api/employees';
import { carsApi } from '@/api/cars';
import { cardsApi } from '@/api/cards';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/utils/toast';
import { getApiErrorMessage } from '@/utils/apiError';
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

onMounted(async () => {
	await loadFilterData();
	await fetchTransactions();
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

		<div class="filters card">
			<h3>Фильтры</h3>
			<div class="filters-grid">
				<div class="form-group">
					<label>Поиск</label>
					<SearchInput v-model="searchQuery" placeholder="Поиск по сумме, месту, типу топлива..." />
				</div>
				<div class="form-group">
					<label>Дата от</label>
					<input v-model="filters.dateFrom" type="date" class="form-input" />
				</div>
				<div class="form-group">
					<label>Дата до</label>
					<input v-model="filters.dateTo" type="date" class="form-input" />
				</div>
				<div class="form-group">
					<label>Сотрудник</label>
					<select v-model="filters.employeeId" class="form-input">
						<option value="">Все</option>
						<option v-for="emp in employees" :key="emp._id" :value="emp._id">
							{{ emp.full_name }}
						</option>
					</select>
				</div>
				<div class="form-group">
					<label>Автомобиль</label>
					<select v-model="filters.carId" class="form-input">
						<option value="">Все</option>
						<option v-for="car in cars" :key="car._id" :value="car._id">
							{{ car.brand }} {{ car.model }} ({{ car.plate_number }})
						</option>
					</select>
				</div>
				<div class="form-group">
					<label>Карта</label>
					<select v-model="filters.cardId" class="form-input">
						<option value="">Все</option>
						<option v-for="card in cards" :key="card._id" :value="card._id">
							{{ card.card_number }}
						</option>
					</select>
				</div>
				<div class="form-group">
					<label>Статус</label>
					<select v-model="filters.status" class="form-input">
						<option value="">Все</option>
						<option value="completed">Завершена</option>
						<option value="pending">В ожидании</option>
						<option value="cancelled">Отменена</option>
					</select>
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

		<div class="loading" v-if="loading">Загрузка...</div>
		<template v-else>
			<DataTable
				:data="filteredTransactions"
				:columns="columns"
				:actions="tableActions"
				:selectable="true"
				:selected-rows="selectedTransactions"
				@update:selected-rows="selectedTransactions = $event"
			>
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
				<div class="form-group">
					<label>Новый статус</label>
					<select v-model="bulkStatusForm.status" class="form-input" required>
						<option value="completed">Завершена</option>
						<option value="pending">В ожидании</option>
						<option value="cancelled">Отменена</option>
					</select>
				</div>
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
				<div class="form-group">
					<label>Карта</label>
					<select v-model="formData.card_id" required class="form-input">
						<option value="">Выберите карту</option>
						<option v-for="card in cards" :key="card._id" :value="card._id">
							{{ card.card_number }} ({{ card.type === 'fuel' ? 'Топливная' : 'Сервисная' }})
						</option>
					</select>
				</div>
				<div class="form-group">
					<label>Сотрудник</label>
					<select v-model="formData.employee_id" required class="form-input">
						<option value="">Выберите сотрудника</option>
						<option v-for="emp in employees" :key="emp._id" :value="emp._id">
							{{ emp.full_name }}
						</option>
					</select>
				</div>
				<div class="form-group">
					<label>Автомобиль</label>
					<select v-model="formData.car_id" required class="form-input">
						<option value="">Выберите автомобиль</option>
						<option v-for="car in cars" :key="car._id" :value="car._id">
							{{ car.brand }} {{ car.model }} ({{ car.plate_number }})
						</option>
					</select>
				</div>
				<div class="form-group">
					<label>Сумма</label>
					<input v-model.number="formData.amount" type="number" step="0.01" required class="form-input" />
				</div>
				<div class="form-group">
					<label>Объем (л)</label>
					<input v-model.number="formData.volume" type="number" step="0.01" required class="form-input" />
				</div>
				<div class="form-group">
					<label>Тип топлива</label>
					<select v-model="formData.fuel_type" required class="form-input">
						<option value="">Выберите тип</option>
						<option value="АИ-95">АИ-95</option>
						<option value="АИ-92">АИ-92</option>
						<option value="Дизель">Дизель</option>
						<option value="Газ">Газ</option>
					</select>
				</div>
				<div class="form-group">
					<label>Место</label>
					<input v-model="formData.location" required class="form-input" />
				</div>
				<div class="form-group">
					<label>Пробег</label>
					<input v-model.number="formData.odometer" type="number" required class="form-input" />
				</div>
				<div class="form-group">
					<label>Дата</label>
					<input v-model="formData.date" type="datetime-local" required class="form-input" />
				</div>
				<div class="form-group">
					<label>Статус</label>
					<select v-model="formData.status" required class="form-input">
						<option value="completed">Завершена</option>
						<option value="pending">В ожидании</option>
						<option value="cancelled">Отменена</option>
					</select>
				</div>
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

.filters {
	margin-bottom: $spacing-lg;
	padding: $spacing-lg;

	h3 {
		margin-bottom: $spacing-md;
		font-size: $font-size-lg;
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

.no-results {
	padding: $spacing-xl;
	text-align: center;
	color: #666;
	background: white;
	border-radius: $border-radius;
	box-shadow: $shadow-sm;
}
</style>
