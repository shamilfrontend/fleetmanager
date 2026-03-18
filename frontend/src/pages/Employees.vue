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
	let filtered = filterData(employeesStore.employees, searchQuery.value, ['full_name', 'position', 'department', 'phone']);

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

const hasActiveFilters = computed(() => Boolean(searchQuery.value || filters.value.status || filters.value.department));

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
				await runBulkInBatches(items, BULK_BATCH_SIZE, (employee) => employeesStore.deleteEmployee(employee._id));
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

const columns = [
	{ key: 'full_name', label: 'ФИО' },
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

onMounted(async () => {
	await fetchEmployeesPage();
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
			<div class="filters card">
				<h3>Фильтры</h3>
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
			:title="editingEmployee ? 'Редактировать сотрудника' : 'Добавить сотрудника'"
			@confirm="handleSave"
			@update:is-open="(val) => { if (!val) resetForm() }"
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
					<input id="employee-hire_date" v-model="formData.hire_date" type="date" required class="form-input" />
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
			@update:is-open="(val) => { if (!val) { bulkStatusForm.status = 'active'; bulkProgress.value = { done: 0, total: 0 }; } }"
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
	color: #666;
	background: white;
	border-radius: $border-radius;
	box-shadow: $shadow-sm;
}
</style>
