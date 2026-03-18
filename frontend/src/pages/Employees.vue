<script setup lang="ts">
import {
	ref, computed, watch, onMounted,
} from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AppButton from '@/components/common/AppButton.vue';
import DataTable from '@/components/common/DataTable.vue';
import Confirm from '@/components/common/Confirm.vue';
import { useConfirm } from '@/composables/useConfirm';
import Modal from '@/components/common/Modal.vue';
import SearchInput from '@/components/common/SearchInput.vue';
import Pagination from '@/components/common/Pagination.vue';
import FormField from '@/components/common/FormField.vue';
import AppSelect from '@/components/common/AppSelect.vue';
import { useEmployeesStore } from '@/stores/employees';
import { useAuthStore } from '@/stores/auth';
import { employeesApi } from '@/api/employees';
import { toast } from '@/utils/toast';
import { getApiErrorMessage } from '@/utils/apiError';
import { runBulkInBatches } from '@/utils/runBulkInBatches';
import { filterData } from '@/utils/filter';
import { exportToCSV, exportToExcel } from '@/utils/export';
import type { Employee } from '@/types';

const router = useRouter();
const route = useRoute();
const employeesStore = useEmployeesStore();
const authStore = useAuthStore();
const confirm = useConfirm();
const showModal = ref(false);
const editingEmployee = ref<Employee | null>(null);
const searchQuery = ref('');
const filters = ref({
	status: '',
	department: '',
});
const selectedEmployees = ref<Employee[]>([]);
const showBulkStatusModal = ref(false);
const bulkStatusForm = ref({
	status: 'active' as Employee['status'],
});
const bulkProgress = ref({ done: 0, total: 0 });
const bulkSaving = ref(false);
const BULK_BATCH_SIZE = 8;

// Статистика для карточек (Vuexy-style)
const statsActive = ref<number | null>(null);
const statsInactive = ref<number | null>(null);

const formData = ref<Partial<Employee>>({
	full_name: '',
	position: '',
	department: '',
	phone: '',
	hire_date: new Date().toISOString().split('T')[0],
	status: 'active',
	assigned_cars: [],
});

const departments = computed(() => {
	const depts = new Set<string>();
	employeesStore.employees.forEach((emp) => {
		if (emp.department) depts.add(emp.department);
	});
	return Array.from(depts).sort();
});

const departmentsCount = computed(() => departments.value.length);

/** Инициалы для аватара: первые буквы слов ФИО (1–2 буквы) */
function getInitials(fullName: string): string {
	if (!fullName || typeof fullName !== 'string') return '?';
	const words = fullName.trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return '?';
	if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
	return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

const employeeStatusOptions = [
	{ value: 'active', label: 'Активен' },
	{ value: 'inactive', label: 'Неактивен' },
];
const filterStatusOptions = [
	{ value: '', label: 'Все' },
	...employeeStatusOptions,
];
const filterDepartmentOptions = computed(() => [
	{ value: '', label: 'Все отделы' },
	...departments.value.map((d) => ({ value: d, label: d })),
]);

const filteredEmployees = computed(() => {
	let filtered = filterData(
		employeesStore.employees,
		searchQuery.value,
		['full_name', 'position', 'department', 'phone'],
	);

	// Фильтр по статусу
	if (filters.value.status) {
		filtered = filtered.filter((emp) => emp.status === filters.value.status);
	}

	// Фильтр по отделу
	if (filters.value.department) {
		filtered = filtered.filter((emp) => emp.department === filters.value.department);
	}

	return filtered;
});

const hasActiveFilters = computed(() =>
	Boolean(searchQuery.value || filters.value.status || filters.value.department),
);

const modalTitle = computed(() =>
	editingEmployee.value ? 'Редактировать сотрудника' : 'Добавить сотрудника',
);

const currentPage = ref(1);
const pageSize = ref(25);

const fetchEmployeesPage = async () => {
	await employeesStore.fetchEmployees({
		page: currentPage.value,
		limit: pageSize.value,
		status: filters.value.status || undefined,
	});
};

const onPageChange = (page: number) => {
	if (page === currentPage.value) return;
	currentPage.value = page;
	fetchEmployeesPage();
};

const onPageSizeChange = (size: number) => {
	if (size === pageSize.value) return;
	pageSize.value = size;
	currentPage.value = 1;
	fetchEmployeesPage();
};

const resetFilters = () => {
	searchQuery.value = '';
	filters.value = {
		status: '',
		department: '',
	};
	currentPage.value = 1;
	fetchEmployeesPage();
};

watch(() => filters.value.status, () => {
	currentPage.value = 1;
	fetchEmployeesPage();
});

const clearSelection = () => {
	selectedEmployees.value = [];
};

const resetBulkProgress = () => {
	bulkProgress.value = { done: 0, total: 0 };
};

const onBulkStatusModalClose = (val: boolean) => {
	if (!val) {
		bulkStatusForm.value.status = 'active';
		resetBulkProgress();
	}
};

const bulkChangeStatus = () => {
	if (selectedEmployees.value.length === 0) return;
	bulkProgress.value = { done: 0, total: 0 };
	showBulkStatusModal.value = true;
};

const handleBulkStatusSave = async () => {
	const items = [...selectedEmployees.value];
	const total = items.length;
	if (total === 0) return;
	bulkSaving.value = true;
	bulkProgress.value = { done: 0, total };
	try {
		await runBulkInBatches(
			items,
			BULK_BATCH_SIZE,
			(employee) => employeesStore.updateEmployee(employee._id, { status: bulkStatusForm.value.status }),
			(done, tot) => { bulkProgress.value = { done, total: tot }; },
		);
		toast.success(`Статус изменен для ${total} сотрудников`);
		clearSelection();
		showBulkStatusModal.value = false;
		await fetchEmployeesPage();
	} catch (error: unknown) {
		toast.error(getApiErrorMessage(error));
	} finally {
		bulkSaving.value = false;
		bulkProgress.value = { done: 0, total: 0 };
	}
};

const bulkDelete = () => {
	if (selectedEmployees.value.length === 0) return;
	const count = selectedEmployees.value.length;
	confirm.openConfirm(`Удалить ${count} сотрудников?`, {
		onConfirm: async () => {
			try {
				const items = [...selectedEmployees.value];
				await runBulkInBatches(
					items,
					BULK_BATCH_SIZE,
					(employee) => employeesStore.deleteEmployee(employee._id),
				);
				toast.success(`Удалено ${count} сотрудников`);
				clearSelection();
				await fetchEmployeesPage();
			} catch (error: unknown) {
				toast.error(getApiErrorMessage(error));
			}
		},
	});
};

const resetForm = () => {
	formData.value = {
		full_name: '',
		position: '',
		department: '',
		phone: '',
		hire_date: new Date().toISOString().split('T')[0],
		status: 'active',
		assigned_cars: [],
	};
	editingEmployee.value = null;
};

const columns: { key: string; label: string; format?: 'date' | 'currency' | 'number' }[] = [
	{ key: 'full_name', label: 'Сотрудник' },
	{ key: 'position', label: 'Должность' },
	{ key: 'department', label: 'Отдел' },
	{ key: 'phone', label: 'Телефон' },
	{ key: 'hire_date', label: 'Дата найма', format: 'date' },
	{ key: 'status', label: 'Статус' },
];

const tableActions = [
	{
		name: 'view',
		label: 'Просмотр',
		handler: (row: Employee) => {
			const id = row._id;
			if (id) {
				router.push(`/employees/${id}`);
			}
		},
	},
	{
		name: 'edit',
		label: 'Редактировать',
		handler: (row: Employee) => {
			editingEmployee.value = row;
			formData.value = { ...row };
			showModal.value = true;
		},
	},
	{
		name: 'delete',
		label: 'Удалить',
		type: 'danger' as const,
		handler: (row: Employee) => {
			confirm.openConfirm('Удалить сотрудника?', {
				onConfirm: async () => {
					try {
						await employeesStore.deleteEmployee(row._id);
						toast.success('Сотрудник успешно удален');
						await fetchEmployeesPage();
					} catch (error: unknown) {
						toast.error(getApiErrorMessage(error));
					}
				},
			});
		},
	},
];

const handleSave = async () => {
	try {
		if (editingEmployee.value) {
			await employeesStore.updateEmployee(editingEmployee.value._id, formData.value);
			toast.success('Сотрудник успешно обновлен');
		} else {
			await employeesStore.createEmployee(formData.value);
			toast.success('Сотрудник успешно создан');
		}
		resetForm();
		showModal.value = false;
		await fetchEmployeesPage();
	} catch (error: unknown) {
		toast.error(getApiErrorMessage(error));
	}
};

const handleExport = async (format: 'csv' | 'excel') => {
	try {
		if (format === 'csv') {
			exportToCSV(filteredEmployees.value, 'сотрудники', columns);
		} else {
			await exportToExcel(filteredEmployees.value, 'сотрудники', columns);
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
		const [activeRes, inactiveRes] = await Promise.all([
			employeesApi.getAll({ status: 'active', page: 1, limit: 1 }),
			employeesApi.getAll({ status: 'inactive', page: 1, limit: 1 }),
		]);
		statsActive.value = activeRes.total;
		statsInactive.value = inactiveRes.total;
	} catch {
		statsActive.value = 0;
		statsInactive.value = 0;
	}
};

onMounted(async () => {
	await fetchEmployeesPage();
	await loadStats();
	const editId = route.query.edit as string;
	if (editId) {
		let emp = employeesStore.employees.find((e) => e._id === editId);
		if (!emp) {
			try {
				emp = await employeesApi.getById(editId);
			} catch {
				window.history.replaceState({}, '', window.location.pathname);
				return;
			}
		}
		if (emp) {
			editingEmployee.value = emp;
			formData.value = { ...emp };
			showModal.value = true;
		}
		window.history.replaceState({}, '', window.location.pathname);
	}
});
</script>

<template>
	<div class="employees-page">
		<div class="page-header">
			<h1>Сотрудники</h1>
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
					Добавить сотрудника
				</AppButton>
			</div>
		</div>

		<div v-if="employeesStore.loading" class="loading" role="status" aria-live="polite" aria-label="Загрузка данных">Загрузка...</div>
		<div v-else-if="employeesStore.error" class="error">{{ employeesStore.error }}</div>
		<template v-else>
			<div class="stats-grid">
				<div class="stat-card card">
					<div class="stat-icon">👥</div>
					<div class="stat-info">
						<h3 class="stat-value">{{ employeesStore.total }}</h3>
						<p class="stat-label">Всего сотрудников</p>
						<p class="stat-detail">В базе</p>
					</div>
				</div>
				<div class="stat-card card">
					<div class="stat-icon" aria-hidden="true">✓</div>
					<div class="stat-info">
						<h3 class="stat-value">{{ statsActive !== null ? statsActive : '—' }}</h3>
						<p class="stat-label">Активные</p>
						<p class="stat-detail">Работают в компании</p>
					</div>
				</div>
				<div class="stat-card card">
					<div class="stat-icon">○</div>
					<div class="stat-info">
						<h3 class="stat-value">{{ statsInactive !== null ? statsInactive : '—' }}</h3>
						<p class="stat-label">Неактивные</p>
						<p class="stat-detail">Не на работе</p>
					</div>
				</div>
				<div class="stat-card card">
					<div class="stat-icon">🏢</div>
					<div class="stat-info">
						<h3 class="stat-value">{{ departmentsCount }}</h3>
						<p class="stat-label">Отделов</p>
						<p class="stat-detail">На текущей странице</p>
					</div>
				</div>
			</div>
			<div class="filters card">
				<h4 class="filters-title">Фильтры</h4>
				<div class="filters-grid">
					<div class="form-group">
						<label>Поиск</label>
						<SearchInput v-model="searchQuery" placeholder="Поиск по ФИО, должности, отделу..." />
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
						<label>Отдел</label>
						<AppSelect
							v-model="filters.department"
							:options="filterDepartmentOptions"
							placeholder="Все отделы"
							searchable
						/>
					</div>
				</div>
				<div class="filters-actions">
					<AppButton variant="secondary" @click="resetFilters">Сбросить фильтры</AppButton>
				</div>
			</div>
			<div v-if="selectedEmployees.length > 0" class="bulk-actions card">
				<div class="bulk-info">
					Выбрано: {{ selectedEmployees.length }}
				</div>
				<div class="bulk-buttons">
					<AppButton size="sm" variant="secondary" @click="bulkChangeStatus">Изменить статус</AppButton>
					<AppButton size="sm" variant="danger" @click="bulkDelete">Удалить</AppButton>
					<AppButton size="sm" variant="secondary" @click="clearSelection">Снять выделение</AppButton>
				</div>
			</div>
			<DataTable
				:data="filteredEmployees"
				:columns="columns"
				:actions="tableActions"
				:selectable="true"
				:selected-rows="selectedEmployees"
				@update:selected-rows="selectedEmployees = $event"
			>
				<template #cell-full_name="{ row }">
					<div class="employee-cell">
						<span class="avatar">{{ getInitials((row as unknown as Employee).full_name) }}</span>
						<span class="employee-name">{{ (row as unknown as Employee).full_name }}</span>
					</div>
				</template>
				<template #cell-status="{ value }">
					<span class="status-badge" :class="value === 'active' ? 'status-active' : 'status-inactive'">
						{{ value === 'active' ? 'Активен' : 'Неактивен' }}
					</span>
				</template>
				<template #empty>
					<div class="table-empty-state">
						<p class="table-empty-state__text">Нет сотрудников</p>
						<p class="table-empty-state__hint">Добавьте первого сотрудника</p>
						<AppButton
							v-if="authStore.isManager || authStore.isAdmin"
							variant="primary"
							@click="resetForm(); showModal = true"
						>
							Добавить сотрудника
						</AppButton>
					</div>
				</template>
			</DataTable>
			<Pagination
				v-if="employeesStore.total > 0"
				:current-page="currentPage"
				:page-size="pageSize"
				:total="employeesStore.total"
				@update:current-page="onPageChange"
				@update:page-size="onPageSizeChange"
			/>
			<div v-if="filteredEmployees.length === 0 && (searchQuery || hasActiveFilters)" class="no-results">
				<p>Нет результатов по заданным фильтрам</p>
				<AppButton size="sm" variant="secondary" @click="resetFilters">Сбросить фильтры</AppButton>
			</div>
		</template>

		<Modal
			v-model:is-open="showModal"
			:title="modalTitle"
			@confirm="handleSave"
			@update:is-open="(val: boolean) => { if (!val) resetForm(); }"
		>
			<form class="employee-form">
				<FormField label="ФИО" required field-id="employee-full_name">
					<input id="employee-full_name" v-model="formData.full_name" required class="form-input" />
				</FormField>
				<FormField label="Должность" required field-id="employee-position">
					<input id="employee-position" v-model="formData.position" required class="form-input" />
				</FormField>
				<FormField label="Отдел" required field-id="employee-department">
					<input id="employee-department" v-model="formData.department" required class="form-input" />
				</FormField>
				<FormField label="Телефон" required field-id="employee-phone">
					<input id="employee-phone" v-model="formData.phone" required class="form-input" />
				</FormField>
				<FormField label="Дата найма" required field-id="employee-hire_date">
					<input
						id="employee-hire_date"
						v-model="formData.hire_date"
						type="date"
						required
						class="form-input"
					/>
				</FormField>
				<FormField label="Статус" required field-id="employee-status">
					<AppSelect
						field-id="employee-status"
						v-model="formData.status"
						:options="employeeStatusOptions"
						placeholder="Выберите статус"
					/>
				</FormField>
			</form>
		</Modal>

		<!-- Модальное окно массового изменения статуса -->
		<Modal
			v-model:is-open="showBulkStatusModal"
			title="Изменить статус"
			:confirm-disabled="bulkSaving"
			@confirm="handleBulkStatusSave"
			@update:is-open="onBulkStatusModalClose"
		>
			<form class="bulk-status-form">
				<FormField label="Новый статус" required field-id="employee-bulk-status">
					<AppSelect
						field-id="employee-bulk-status"
						v-model="bulkStatusForm.status"
						:options="employeeStatusOptions"
						placeholder="Выберите статус"
					/>
				</FormField>
				<p class="form-hint">
					Будет изменен статус для {{ selectedEmployees.length }} сотрудников
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

.loading,
.error {
	padding: $spacing-lg;
	text-align: center;
}

.error {
	color: $warning;
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
	border-radius: $border-radius;
}

.bulk-info {
	font-weight: 500;
	color: $text-primary;
}

.bulk-buttons {
	display: flex;
	gap: $spacing-sm;
}

.employee-form {
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

.bulk-progress {
	font-size: $font-size-sm;
	color: $text-muted;
	margin-top: $spacing-sm;
}

.no-results {
	padding: $spacing-xl;
	text-align: center;
	color: $text-secondary;
	background: $bg-elevated;
	border-radius: $border-radius;
	box-shadow: $shadow-sm;
}

.employee-cell {
	display: flex;
	align-items: center;
	gap: $spacing-md;
}

.avatar {
	width: 36px;
	height: 36px;
	min-width: 36px;
	border-radius: 50%;
	background: $primary-light;
	color: $primary-dark;
	font-size: $font-size-sm;
	font-weight: $font-weight-semibold;
	display: flex;
	align-items: center;
	justify-content: center;
}

.employee-name {
	font-weight: $font-weight-medium;
	color: $text-primary;
}

.status-badge {
	display: inline-block;
	padding: $spacing-xs $spacing-sm;
	border-radius: $radius-sm;
	font-size: $font-size-xs;
	font-weight: $font-weight-medium;
}

.status-active {
	background: $success-light;
	color: $success;
}

.status-inactive {
	background: $bg-subtle;
	color: $text-muted;
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
