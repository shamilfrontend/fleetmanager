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
import { useEmployeesStore } from '@/stores/employees';
import { useAuthStore } from '@/stores/auth';
import { employeesApi } from '@/api/employees';
import { toast } from '@/utils/toast';
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
	showBulkStatusModal.value = true;
};

const handleBulkStatusSave = async () => {
	try {
		for (const employee of selectedEmployees.value) {
			await employeesStore.updateEmployee(employee._id, { status: bulkStatusForm.value.status });
		}
		toast.success(`Статус изменен для ${selectedEmployees.value.length} сотрудников`);
		clearSelection();
		showBulkStatusModal.value = false;
		await fetchEmployeesPage();
	} catch (error: any) {
		toast.error(error?.response?.data?.message || 'Ошибка изменения статуса');
	}
};

const bulkDelete = () => {
	if (selectedEmployees.value.length === 0) return;
	const count = selectedEmployees.value.length;
	confirm.openConfirm(`Удалить ${count} сотрудников?`, {
		onConfirm: async () => {
			try {
				for (const employee of selectedEmployees.value) {
					await employeesStore.deleteEmployee(employee._id);
				}
				toast.success(`Удалено ${count} сотрудников`);
				clearSelection();
				await fetchEmployeesPage();
			} catch (error: any) {
				toast.error(error?.response?.data?.message || 'Ошибка удаления');
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
					} catch (error: any) {
						toast.error(error?.response?.data?.message || 'Ошибка удаления сотрудника');
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
	} catch (error: any) {
		toast.error(error?.response?.data?.message || 'Ошибка сохранения сотрудника');
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

		<div v-if="employeesStore.loading" class="loading">Загрузка...</div>
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
						<select v-model="filters.status" class="form-input">
							<option value="">Все</option>
							<option value="active">Активен</option>
							<option value="inactive">Неактивен</option>
						</select>
					</div>
					<div class="form-group">
						<label>Отдел</label>
						<select v-model="filters.department" class="form-input">
							<option value="">Все отделы</option>
							<option v-for="dept in departments" :key="dept" :value="dept">{{ dept }}</option>
						</select>
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
				<div class="form-group">
					<label>ФИО</label>
					<input v-model="formData.full_name" required class="form-input" />
				</div>
				<div class="form-group">
					<label>Должность</label>
					<input v-model="formData.position" required class="form-input" />
				</div>
				<div class="form-group">
					<label>Отдел</label>
					<input v-model="formData.department" required class="form-input" />
				</div>
				<div class="form-group">
					<label>Телефон</label>
					<input v-model="formData.phone" required class="form-input" />
				</div>
				<div class="form-group">
					<label>Дата найма</label>
					<input v-model="formData.hire_date" type="date" required class="form-input" />
				</div>
				<div class="form-group">
					<label>Статус</label>
					<select v-model="formData.status" required class="form-input">
						<option value="active">Активен</option>
						<option value="inactive">Неактивен</option>
					</select>
				</div>
			</form>
		</Modal>

		<!-- Модальное окно массового изменения статуса -->
		<Modal
			v-model:is-open="showBulkStatusModal"
			title="Изменить статус"
			@confirm="handleBulkStatusSave"
			@update:is-open="(val) => { if (!val) bulkStatusForm.status = 'active' }"
		>
			<form class="bulk-status-form">
				<div class="form-group">
					<label>Новый статус <span class="required">*</span></label>
					<select v-model="bulkStatusForm.status" class="form-input" required>
						<option value="active">Активен</option>
						<option value="inactive">Неактивен</option>
					</select>
				</div>
				<p class="form-hint">
					Будет изменен статус для {{ selectedEmployees.length }} сотрудников
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

.no-results {
	padding: $spacing-xl;
	text-align: center;
	color: #666;
	background: white;
	border-radius: $border-radius;
	box-shadow: $shadow-sm;
}
</style>
