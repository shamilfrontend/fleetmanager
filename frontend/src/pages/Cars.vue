<script setup lang="ts">
import {
	ref, computed, watch, onMounted,
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
import { useCarsStore } from '@/stores/cars';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/utils/toast';
import { getApiErrorMessage } from '@/utils/apiError';
import { runBulkInBatches } from '@/utils/runBulkInBatches';
import { validateForm, type ValidationRule } from '@/utils/validation';
import { filterData } from '@/utils/filter';
import { exportToCSV, exportToExcel } from '@/utils/export';
import { maintenanceApi, type MaintenanceHistory } from '@/api/maintenance';
import { formatDate, formatCurrency } from '@/utils/helpers';
import { API_ORIGIN } from '@/utils/constants';
import { getCarStatusLabel, getServiceTypeLabel } from '@/utils/labels';
import { carsApi } from '@/api/cars';
import type { Car } from '@/types';

const route = useRoute();
const router = useRouter();
const carsStore = useCarsStore();
const authStore = useAuthStore();
const confirm = useConfirm();
const showModal = ref(false);
const editingCar = ref<Car | null>(null);
const searchQuery = ref('');
const filters = ref({
	status: '',
	yearFrom: undefined as number | undefined,
	yearTo: undefined as number | undefined,
});
const selectedCars = ref<Car[]>([]);
const showMaintenanceModal = ref(false);
const showMaintenanceForm = ref(false);
const showBulkStatusModal = ref(false);
const selectedCar = ref<Car | null>(null);
const bulkStatusForm = ref({
	status: 'active' as Car['status'],
});
const bulkProgress = ref({ done: 0, total: 0 });
const bulkSaving = ref(false);
const BULK_BATCH_SIZE = 8;
const maintenanceHistory = ref<MaintenanceHistory[]>([]);
const photoInput = ref<HTMLInputElement | null>(null);
const documentInput = ref<HTMLInputElement | null>(null);
const uploadingPhoto = ref(false);
const uploadingDocument = ref(false);
const maintenanceForm = ref({
	service_type: 'regular' as MaintenanceHistory['service_type'],
	description: '',
	cost: 0,
	mileage: 0,
	service_date: new Date().toISOString().split('T')[0],
	next_service_date: '',
	next_service_mileage: undefined as number | undefined,
	service_provider: '',
});
const formData = ref<Partial<Car>>({
	brand: '',
	model: '',
	plate_number: '',
	vin: '',
	year: new Date().getFullYear(),
	mileage: 0,
	status: 'active',
	equipment: [],
});

const filteredCars = computed(() => {
	let filtered = filterData(carsStore.cars, searchQuery.value, ['brand', 'model', 'plate_number', 'vin']);

	// Фильтр по статусу
	if (filters.value.status) {
		filtered = filtered.filter((car) => car.status === filters.value.status);
	}

	// Фильтр по году
	if (filters.value.yearFrom !== undefined) {
		filtered = filtered.filter((car) => car.year >= filters.value.yearFrom!);
	}

	if (filters.value.yearTo !== undefined) {
		filtered = filtered.filter((car) => car.year <= filters.value.yearTo!);
	}

	return filtered;
});

const hasActiveFilters = computed(() => Boolean(
	searchQuery.value
		|| filters.value.status
		|| filters.value.yearFrom != null
		|| filters.value.yearTo != null,
));

const currentPage = ref(1);
const pageSize = ref(25);

const fetchCarsPage = async () => {
	await carsStore.fetchCars({
		page: currentPage.value,
		limit: pageSize.value,
		status: filters.value.status || undefined,
	});
};

const onPageChange = (page: number) => {
	if (page === currentPage.value) return;
	currentPage.value = page;
	fetchCarsPage();
};

const onPageSizeChange = (size: number) => {
	if (size === pageSize.value) return;
	pageSize.value = size;
	currentPage.value = 1;
	fetchCarsPage();
};

const resetFilters = () => {
	searchQuery.value = '';
	filters.value = {
		status: '',
		yearFrom: undefined,
		yearTo: undefined,
	};
	currentPage.value = 1;
	fetchCarsPage();
};

watch(() => filters.value.status, () => {
	currentPage.value = 1;
	fetchCarsPage();
});

const clearSelection = () => {
	selectedCars.value = [];
};

const bulkChangeStatus = () => {
	if (selectedCars.value.length === 0) return;
	bulkProgress.value = { done: 0, total: 0 };
	showBulkStatusModal.value = true;
};

const handleBulkStatusSave = async () => {
	const items = [...selectedCars.value];
	const total = items.length;
	if (total === 0) return;
	bulkSaving.value = true;
	bulkProgress.value = { done: 0, total };
	try {
		await runBulkInBatches(
			items,
			BULK_BATCH_SIZE,
			(car) => carsStore.updateCar(car._id, { status: bulkStatusForm.value.status }),
			(done, tot) => { bulkProgress.value = { done, total: tot }; },
		);
		toast.success(`Статус изменен для ${total} автомобилей`);
		clearSelection();
		showBulkStatusModal.value = false;
		await fetchCarsPage();
	} catch (error: unknown) {
		toast.error(getApiErrorMessage(error));
	} finally {
		bulkSaving.value = false;
		bulkProgress.value = { done: 0, total: 0 };
	}
};

const bulkDelete = () => {
	if (selectedCars.value.length === 0) return;
	const count = selectedCars.value.length;
	confirm.openConfirm(`Удалить ${count} автомобилей?`, {
		onConfirm: async () => {
			try {
				const items = [...selectedCars.value];
				await runBulkInBatches(items, BULK_BATCH_SIZE, (car) => carsStore.deleteCar(car._id));
				toast.success(`Удалено ${count} автомобилей`);
				clearSelection();
				await fetchCarsPage();
			} catch (error: unknown) {
				toast.error(getApiErrorMessage(error));
			}
		},
	});
};

const resetForm = () => {
	formData.value = {
		brand: '',
		model: '',
		plate_number: '',
		vin: '',
		year: new Date().getFullYear(),
		mileage: 0,
		status: 'active',
		equipment: [],
	};
	editingCar.value = null;
	validationErrors.value = {};
};

const openMaintenanceModal = async (car: Car) => {
	selectedCar.value = car;
	showMaintenanceModal.value = true;
	showMaintenanceForm.value = false;
	await loadMaintenanceHistory(car._id);
};

const loadMaintenanceHistory = async (carId: string) => {
	try {
		maintenanceHistory.value = await maintenanceApi.getAll({ carId });
	} catch (error: unknown) {
		console.error('Ошибка загрузки истории ТО:', error);
		toast.error(getApiErrorMessage(error));
	}
};

const resetMaintenanceForm = () => {
	maintenanceForm.value = {
		service_type: 'regular',
		description: '',
		cost: 0,
		mileage: selectedCar.value?.mileage || 0,
		service_date: new Date().toISOString().split('T')[0],
		next_service_date: '',
		next_service_mileage: undefined,
		service_provider: '',
	};
	showMaintenanceForm.value = false;
};

const handleSaveMaintenance = async () => {
	if (!selectedCar.value) return;

	try {
		await maintenanceApi.create({
			...maintenanceForm.value,
			car_id: selectedCar.value._id,
		});
		toast.success('Запись ТО добавлена');
		await loadMaintenanceHistory(selectedCar.value._id);
		resetMaintenanceForm();
		await fetchCarsPage();
	} catch (error: unknown) {
		toast.error(getApiErrorMessage(error));
	}
};

const getPhotoUrl = (photoPath: string) => {
	if (!photoPath) return '';
	if (photoPath.startsWith('http')) return photoPath;
	return `${API_ORIGIN}${photoPath}`;
};

const getDocumentUrl = (docPath: string) => {
	if (!docPath) return '';
	if (docPath.startsWith('http')) return docPath;
	return `${API_ORIGIN}${docPath}`;
};

const getDocumentName = (docPath: string) => docPath.split('/').pop() || 'Документ';

const handlePhotoUpload = async (event: Event) => {
	const target = event.target as HTMLInputElement;
	const file = target.files?.[0];
	if (!file || !editingCar.value) return;

	uploadingPhoto.value = true;
	try {
		const result = await carsApi.uploadPhoto(editingCar.value._id, file);
		if (editingCar.value) {
			editingCar.value.photos = result.car.photos || [];
		}
		toast.success('Фотография загружена');
		await fetchCarsPage();
	} catch (error: unknown) {
		toast.error(getApiErrorMessage(error));
	} finally {
		uploadingPhoto.value = false;
		if (target) target.value = '';
	}
};

const deletePhoto = (photoPath: string) => {
	if (!editingCar.value) return;
	const carId = editingCar.value._id;
	confirm.openConfirm('Удалить фотографию?', {
		onConfirm: async () => {
			try {
				await carsApi.deletePhoto(carId, photoPath);
				if (editingCar.value) {
					editingCar.value.photos = editingCar.value.photos?.filter((p) => p !== photoPath) || [];
				}
				toast.success('Фотография удалена');
				await fetchCarsPage();
			} catch (error: unknown) {
				toast.error(getApiErrorMessage(error));
			}
		},
	});
};

const handleDocumentUpload = async (event: Event) => {
	const target = event.target as HTMLInputElement;
	const file = target.files?.[0];
	if (!file || !editingCar.value) return;

	uploadingDocument.value = true;
	try {
		const result = await carsApi.uploadDocument(editingCar.value._id, file);
		if (editingCar.value) {
			editingCar.value.documents = result.car.documents || [];
		}
		toast.success('Документ загружен');
		await fetchCarsPage();
	} catch (error: unknown) {
		toast.error(getApiErrorMessage(error));
	} finally {
		uploadingDocument.value = false;
		if (target) target.value = '';
	}
};

const deleteDocument = (documentPath: string) => {
	if (!editingCar.value) return;
	const carId = editingCar.value._id;
	confirm.openConfirm('Удалить документ?', {
		onConfirm: async () => {
			try {
				await carsApi.deleteDocument(carId, documentPath);
				if (editingCar.value) {
					editingCar.value.documents = editingCar.value.documents?.filter((d) => d !== documentPath) || [];
				}
				toast.success('Документ удален');
				await fetchCarsPage();
			} catch (error: unknown) {
				toast.error(getApiErrorMessage(error));
			}
		},
	});
};

const columns = [
	{ key: 'brand', label: 'Марка' },
	{ key: 'model', label: 'Модель' },
	{ key: 'plate_number', label: 'Гос. номер' },
	{ key: 'year', label: 'Год' },
	{ key: 'mileage', label: 'Пробег', format: 'number' },
	{ key: 'status', label: 'Статус' },
	{ key: 'maintenance', label: 'ТО' },
];

const tableActions = [
	{
		name: 'view',
		label: 'Просмотр',
		handler: (row: Car) => {
			// Проверяем наличие ID в разных возможных форматах
			const carId = row?._id || row?.id;
			if (!carId) {
				console.error('Car ID is missing:', row);
				toast.error('Ошибка: ID автомобиля не найден');
				return;
			}
			const idString = String(carId);
			// Используем путь напрямую вместо имени маршрута
			router.push(`/cars/${idString}`);
		},
	},
	{
		name: 'edit',
		label: 'Редактировать',
		handler: async (row: Car) => {
			// Загружаем полные данные автомобиля с фотографиями и документами
			try {
				const fullCar = await carsApi.getById(row._id);
				editingCar.value = fullCar;
				formData.value = { ...fullCar };
				showModal.value = true;
			} catch (error) {
				editingCar.value = row;
				formData.value = { ...row };
				showModal.value = true;
			}
		},
	},
	{
		name: 'delete',
		label: 'Удалить',
		type: 'danger' as const,
		handler: (row: Car) => {
			confirm.openConfirm('Удалить автомобиль?', {
				onConfirm: async () => {
					try {
						await carsStore.deleteCar(row._id);
						toast.success('Автомобиль успешно удален');
						await fetchCarsPage();
					} catch (error: unknown) {
						toast.error(getApiErrorMessage(error));
					}
				},
			});
		},
	},
];

const validationErrors = ref<Record<string, string>>({});

const CAR_FORM_RULES: Record<string, ValidationRule> = {
	brand: { required: true, label: 'Марка' },
	model: { required: true, label: 'Модель' },
	plate_number: { required: true, label: 'Гос. номер' },
	vin: {
		required: true,
		minLength: 17,
		maxLength: 17,
		label: 'VIN',
	},
	year: {
		required: true,
		min: 1900,
		max: new Date().getFullYear() + 1,
		label: 'Год',
	},
	mileage: {
		custom: (v) => {
			if (v === undefined || v === null) return 'Пробег обязателен для заполнения';
			if (typeof v === 'number' && v < 0) return 'Пробег должен быть неотрицательным числом';
			return true;
		},
		label: 'Пробег',
	},
};

const validateCarForm = () => {
	const data = {
		...formData.value,
		brand: formData.value.brand?.trim(),
		model: formData.value.model?.trim(),
		plate_number: formData.value.plate_number?.trim(),
		vin: formData.value.vin?.trim(),
	};
	const errors = validateForm(data, CAR_FORM_RULES);
	validationErrors.value = errors;
	return Object.keys(errors).length === 0;
};

const handleSave = async () => {
	if (!validateCarForm()) {
		toast.error('Пожалуйста, исправьте ошибки в форме');
		return;
	}

	try {
		if (editingCar.value) {
			await carsStore.updateCar(editingCar.value._id, formData.value);
			toast.success('Автомобиль успешно обновлен');
		} else {
			await carsStore.createCar(formData.value);
			toast.success('Автомобиль успешно создан');
		}
		validationErrors.value = {};
		resetForm();
		showModal.value = false;
		await fetchCarsPage();
	} catch (error: unknown) {
		toast.error(getApiErrorMessage(error));
	}
};

const handleExport = async (format: 'csv' | 'excel') => {
	try {
		if (format === 'csv') {
			exportToCSV(filteredCars.value, 'автомобили', columns);
		} else {
			await exportToExcel(filteredCars.value, 'автомобили', columns);
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
	const statusFromQuery = route.query.status as string;
	if (statusFromQuery && ['active', 'repair', 'reserve'].includes(statusFromQuery)) {
		filters.value.status = statusFromQuery;
	}
	await fetchCarsPage();

	const editCarId = route.query.edit as string;
	if (editCarId) {
		let car = carsStore.cars.find((c) => c._id === editCarId);
		if (!car) {
			try {
				car = await carsApi.getById(editCarId);
			} catch {
				window.history.replaceState({}, '', window.location.pathname);
				return;
			}
		}
		if (car) {
			try {
				const fullCar = await carsApi.getById(car._id);
				editingCar.value = fullCar;
				formData.value = { ...fullCar };
				showModal.value = true;
			} catch {
				editingCar.value = car;
				formData.value = { ...car };
				showModal.value = true;
			}
		}
		window.history.replaceState({}, '', window.location.pathname);
		return;
	}

	const maintenanceCarId = route.query.maintenance as string;
	if (maintenanceCarId) {
		let car = carsStore.cars.find((c) => c._id === maintenanceCarId);
		if (!car) {
			try {
				car = await carsApi.getById(maintenanceCarId);
			} catch {
				window.history.replaceState({}, '', window.location.pathname);
				return;
			}
		}
		if (car) {
			await openMaintenanceModal(car);
			window.history.replaceState({}, '', window.location.pathname);
		}
	}
});
</script>

<template>
	<div class="cars-page">
		<div class="page-header">
			<h1>Гараж</h1>
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
					Добавить автомобиль
				</AppButton>
			</div>
		</div>

		<div v-if="carsStore.loading" class="loading" role="status" aria-live="polite" aria-label="Загрузка данных">Загрузка...</div>
		<div v-else-if="carsStore.error" class="error">{{ carsStore.error }}</div>
		<template v-else>
			<div class="filters card">
				<h3>Фильтры</h3>
				<div class="filters-grid">
					<div class="form-group">
						<label>Поиск</label>
						<SearchInput v-model="searchQuery" placeholder="Поиск по марке, модели, номеру..." />
					</div>
					<div class="form-group">
						<label>Статус</label>
						<select v-model="filters.status" class="form-input">
							<option value="">Все</option>
							<option value="active">Активен</option>
							<option value="repair">В ремонте</option>
							<option value="reserve">Резерв</option>
						</select>
					</div>
					<div class="form-group">
						<label>Год от</label>
						<input v-model.number="filters.yearFrom" type="number" class="form-input" :min="1900" :max="new Date().getFullYear() + 1" />
					</div>
					<div class="form-group">
						<label>Год до</label>
						<input v-model.number="filters.yearTo" type="number" class="form-input" :min="1900" :max="new Date().getFullYear() + 1" />
					</div>
				</div>
				<div class="filters-actions">
					<AppButton variant="secondary" @click="resetFilters">Сбросить фильтры</AppButton>
				</div>
			</div>
			<div v-if="selectedCars.length > 0" class="bulk-actions card">
				<div class="bulk-info">
					Выбрано: {{ selectedCars.length }}
				</div>
				<div class="bulk-buttons">
					<AppButton size="sm" variant="secondary" @click="bulkChangeStatus">Изменить статус</AppButton>
					<AppButton size="sm" variant="danger" @click="bulkDelete">Удалить</AppButton>
					<AppButton size="sm" variant="secondary" @click="clearSelection">Снять выделение</AppButton>
				</div>
			</div>
			<DataTable
				:data="filteredCars"
				:columns="columns"
				:actions="tableActions"
				:selectable="true"
				:selected-rows="selectedCars"
				@update:selected-rows="selectedCars = $event"
			>
				<template #empty>
					<div class="table-empty-state">
						<p class="table-empty-state__text">Нет автомобилей</p>
						<p class="table-empty-state__hint">Добавьте первый автомобиль в гараж</p>
						<AppButton
							v-if="authStore.isManager || authStore.isAdmin"
							variant="primary"
							@click="resetForm(); showModal = true"
						>
							Добавить автомобиль
						</AppButton>
					</div>
				</template>
				<template #cell-status="{ value }">
					<span class="status-badge" :class="`status-${value}`">
						{{ getCarStatusLabel(value) }}
					</span>
				</template>
				<template #cell-maintenance="{ row }">
					<AppButton size="sm" variant="secondary" @click="() => openMaintenanceModal(row)">
						История ТО
					</AppButton>
				</template>
			</DataTable>
			<Pagination
				v-if="carsStore.total > 0"
				:current-page="currentPage"
				:page-size="pageSize"
				:total="carsStore.total"
				@update:current-page="onPageChange"
				@update:page-size="onPageSizeChange"
			/>
			<div v-if="filteredCars.length === 0 && (searchQuery || hasActiveFilters)" class="no-results">
				<p>Нет результатов по заданным фильтрам</p>
				<AppButton size="sm" variant="secondary" @click="resetFilters">Сбросить фильтры</AppButton>
			</div>
		</template>

		<Modal
			v-model:is-open="showModal"
			:title="editingCar ? 'Редактировать автомобиль' : 'Добавить автомобиль'"
			@confirm="handleSave"
			@update:is-open="(val) => { if (!val) resetForm() }"
		>
			<form class="car-form">
				<FormField label="Марка" :error="validationErrors.brand" required field-id="car-brand">
					<input
						id="car-brand"
						v-model="formData.brand"
						class="form-input"
						:class="{ 'form-input--error': validationErrors.brand }"
						:aria-describedby="validationErrors.brand ? 'car-brand-error' : undefined"
					/>
				</FormField>
				<FormField label="Модель" :error="validationErrors.model" required field-id="car-model">
					<input
						id="car-model"
						v-model="formData.model"
						class="form-input"
						:class="{ 'form-input--error': validationErrors.model }"
						:aria-describedby="validationErrors.model ? 'car-model-error' : undefined"
					/>
				</FormField>
				<FormField label="Гос. номер" :error="validationErrors.plate_number" required field-id="car-plate_number">
					<input
						id="car-plate_number"
						v-model="formData.plate_number"
						class="form-input"
						:class="{ 'form-input--error': validationErrors.plate_number }"
						:aria-describedby="validationErrors.plate_number ? 'car-plate_number-error' : undefined"
					/>
				</FormField>
				<FormField label="VIN" :error="validationErrors.vin" required field-id="car-vin">
					<input
						id="car-vin"
						v-model="formData.vin"
						maxlength="17"
						class="form-input"
						:class="{ 'form-input--error': validationErrors.vin }"
						:aria-describedby="validationErrors.vin ? 'car-vin-error' : undefined"
					/>
				</FormField>
				<FormField label="Год" :error="validationErrors.year" required field-id="car-year">
					<input
						id="car-year"
						v-model.number="formData.year"
						type="number"
						class="form-input"
						:class="{ 'form-input--error': validationErrors.year }"
						:aria-describedby="validationErrors.year ? 'car-year-error' : undefined"
					/>
				</FormField>
				<FormField label="Пробег" :error="validationErrors.mileage" required field-id="car-mileage">
					<input
						id="car-mileage"
						v-model.number="formData.mileage"
						type="number"
						min="0"
						class="form-input"
						:class="{ 'form-input--error': validationErrors.mileage }"
						:aria-describedby="validationErrors.mileage ? 'car-mileage-error' : undefined"
					/>
				</FormField>
				<FormField label="Статус" required field-id="car-status">
					<select id="car-status" v-model="formData.status" class="form-input">
						<option value="active">Активен</option>
						<option value="repair">В ремонте</option>
						<option value="reserve">Резерв</option>
					</select>
				</FormField>

				<FormField v-if="editingCar && editingCar._id" label="Фотографии" field-id="car-photos">
					<div class="photos-section">
						<div v-if="editingCar.photos && editingCar.photos.length > 0" class="photos-grid">
							<div v-for="(photo, index) in editingCar.photos" :key="index" class="photo-item">
								<img :src="getPhotoUrl(photo)" :alt="`${editingCar.brand} ${editingCar.model}`" />
								<AppButton
									size="sm"
									variant="danger"
									:disabled="uploadingPhoto"
									@click="deletePhoto(photo)"
								>
									Удалить
								</AppButton>
							</div>
						</div>
						<div class="upload-section">
							<input
								type="file"
								ref="photoInput"
								accept="image/*"
								@change="handlePhotoUpload"
								style="display: none"
								:disabled="uploadingPhoto"
							/>
							<AppButton
								variant="secondary"
								:disabled="uploadingPhoto"
								@click="() => photoInput?.click()"
							>
								{{ uploadingPhoto ? 'Загрузка...' : 'Добавить фотографию' }}
							</AppButton>
						</div>
					</div>
				</FormField>

				<FormField v-if="editingCar && editingCar._id" label="Документы" field-id="car-documents">
					<div class="documents-section">
						<div v-if="editingCar.documents && editingCar.documents.length > 0" class="documents-list">
							<div v-for="(doc, index) in editingCar.documents" :key="index" class="document-item">
								<span class="document-name">{{ getDocumentName(doc) }}</span>
								<div class="document-actions">
									<a :href="getDocumentUrl(doc)" target="_blank" class="btn btn--small">Открыть</a>
									<AppButton
										size="sm"
										variant="danger"
										:disabled="uploadingDocument"
										@click="deleteDocument(doc)"
									>
										Удалить
									</AppButton>
								</div>
							</div>
						</div>
						<div class="upload-section">
							<input
								type="file"
								ref="documentInput"
								accept=".pdf"
								@change="handleDocumentUpload"
								style="display: none"
								:disabled="uploadingDocument"
							/>
							<AppButton
								variant="secondary"
								:disabled="uploadingDocument"
								@click="() => documentInput?.click()"
							>
								{{ uploadingDocument ? 'Загрузка...' : 'Добавить документ (PDF)' }}
							</AppButton>
						</div>
					</div>
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
				<FormField label="Новый статус" required field-id="car-bulk-status">
					<select id="car-bulk-status" v-model="bulkStatusForm.status" class="form-input" required>
						<option value="active">Активен</option>
						<option value="repair">В ремонте</option>
						<option value="reserve">Резерв</option>
					</select>
				</FormField>
				<p class="form-hint">
					Будет изменен статус для {{ selectedCars.length }} автомобилей
				</p>
				<p v-if="bulkProgress.total > 0" class="bulk-progress">
					Обновлено {{ bulkProgress.done }} из {{ bulkProgress.total }}
				</p>
			</form>
		</Modal>

		<!-- Модальное окно истории ТО -->
		<Modal
			v-model:is-open="showMaintenanceModal"
			title="История ТО"
			:show-footer="false"
			@update:is-open="(val) => { if (!val) resetMaintenanceForm() }"
		>
			<div class="maintenance-content">
				<div class="maintenance-header">
					<h3 v-if="selectedCar">{{ selectedCar.brand }} {{ selectedCar.model }} ({{ selectedCar.plate_number }})</h3>
					<AppButton variant="primary" @click="showMaintenanceForm = true">Добавить ТО</AppButton>
				</div>

				<!-- Форма добавления ТО -->
				<form v-if="showMaintenanceForm" @submit.prevent="handleSaveMaintenance" class="maintenance-form">
					<FormField label="Тип обслуживания" required field-id="cars-maint-service_type">
						<select id="cars-maint-service_type" v-model="maintenanceForm.service_type" class="form-input" required>
							<option value="regular">Регулярное ТО</option>
							<option value="repair">Ремонт</option>
							<option value="inspection">Осмотр</option>
							<option value="tire_change">Замена шин</option>
							<option value="oil_change">Замена масла</option>
							<option value="other">Другое</option>
						</select>
					</FormField>
					<FormField label="Описание" required field-id="cars-maint-description">
						<textarea id="cars-maint-description" v-model="maintenanceForm.description" class="form-input" required></textarea>
					</FormField>
					<div class="form-row">
						<FormField label="Стоимость" required field-id="cars-maint-cost">
							<input id="cars-maint-cost" v-model.number="maintenanceForm.cost" type="number" min="0" class="form-input" required />
						</FormField>
						<FormField label="Пробег" required field-id="cars-maint-mileage">
							<input id="cars-maint-mileage" v-model.number="maintenanceForm.mileage" type="number" min="0" class="form-input" required />
						</FormField>
					</div>
					<div class="form-row">
						<FormField label="Дата обслуживания" required field-id="cars-maint-service_date">
							<input id="cars-maint-service_date" v-model="maintenanceForm.service_date" type="date" class="form-input" required />
						</FormField>
						<FormField label="Следующее ТО" field-id="cars-maint-next_service_date">
							<input id="cars-maint-next_service_date" v-model="maintenanceForm.next_service_date" type="date" class="form-input" />
						</FormField>
					</div>
					<FormField label="Сервис" field-id="cars-maint-service_provider">
						<input id="cars-maint-service_provider" v-model="maintenanceForm.service_provider" class="form-input" />
					</FormField>
					<div class="form-actions">
						<AppButton type="submit" variant="primary">Сохранить</AppButton>
						<AppButton type="button" variant="secondary" @click="showMaintenanceForm = false">Отмена</AppButton>
					</div>
				</form>

				<!-- Список истории ТО -->
				<div v-if="!showMaintenanceForm" class="maintenance-list">
					<div v-if="maintenanceHistory.length === 0" class="no-results">
						История ТО пуста
					</div>
					<div v-else class="maintenance-items">
						<div v-for="item in maintenanceHistory" :key="item._id" class="maintenance-item">
							<div class="maintenance-item-header">
								<span class="service-type">{{ getServiceTypeLabel(item.service_type) }}</span>
								<span class="service-date">{{ formatDate(item.service_date) }}</span>
							</div>
							<div class="maintenance-item-body">
								<p>{{ item.description }}</p>
								<div class="maintenance-item-details">
									<span>Стоимость: {{ formatCurrency(item.cost) }}</span>
									<span>Пробег: {{ item.mileage.toLocaleString('ru-RU') }} км</span>
									<span v-if="item.service_provider">Сервис: {{ item.service_provider }}</span>
								</div>
								<div v-if="item.next_service_date" class="next-service">
									Следующее ТО: {{ formatDate(item.next_service_date) }}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
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

.car-form {
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

	&--error {
		border-color: $warning;
	}
}

.required {
	color: $warning;
	margin-left: 2px;
}

.error-message {
	font-size: $font-size-xs;
	color: $warning;
}

.table-controls {
	margin-bottom: $spacing-md;
	padding: $spacing-md;
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

.no-results {
	padding: $spacing-xl;
	text-align: center;
	color: #666;
	background: white;
	border-radius: $border-radius;
	box-shadow: $shadow-sm;
}

.maintenance-content {
	display: flex;
	flex-direction: column;
	gap: $spacing-lg;
}

.maintenance-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-bottom: $spacing-md;
	border-bottom: 1px solid #e0e0e0;

	h3 {
		margin: 0;
		font-size: $font-size-lg;
		color: $text-primary;
	}
}

.maintenance-form {
	display: flex;
	flex-direction: column;
	gap: $spacing-md;
}

.form-row {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: $spacing-md;
}

.maintenance-list {
	max-height: 500px;
	overflow-y: auto;
}

.maintenance-items {
	display: flex;
	flex-direction: column;
	gap: $spacing-md;
}

.maintenance-item {
	padding: $spacing-md;
	background: $background;
	border-radius: $border-radius;
	border: 1px solid #e0e0e0;
}

.maintenance-item-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: $spacing-sm;

	.service-type {
		font-weight: 600;
		color: $primary-color;
	}

	.service-date {
		color: #666;
		font-size: $font-size-sm;
	}
}

.maintenance-item-body {
	p {
		margin: $spacing-sm 0;
		color: $text-primary;
	}
}

.maintenance-item-details {
	display: flex;
	gap: $spacing-md;
	flex-wrap: wrap;
	font-size: $font-size-sm;
	color: #666;
	margin-top: $spacing-sm;
}

.next-service {
	margin-top: $spacing-sm;
	padding: $spacing-xs $spacing-sm;
	background: rgba($primary-color, 0.1);
	color: $primary-color;
	border-radius: $border-radius-sm;
	font-size: $font-size-sm;
	display: inline-block;
}

.form-actions {
	display: flex;
	gap: $spacing-md;
	justify-content: flex-end;
	margin-top: $spacing-md;
}

.btn--small {
	padding: $spacing-xs $spacing-sm;
	font-size: $font-size-sm;
}

.photos-section,
.documents-section {
	margin-top: $spacing-sm;
}

.photos-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
	gap: $spacing-md;
	margin-bottom: $spacing-md;
}

.photo-item {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: $spacing-xs;

	img {
		width: 100%;
		height: 150px;
		object-fit: cover;
		border-radius: $border-radius;
		border: 1px solid #e0e0e0;
	}
}

.upload-section {
	margin-top: $spacing-sm;
}

.documents-list {
	display: flex;
	flex-direction: column;
	gap: $spacing-sm;
	margin-bottom: $spacing-md;
}

.document-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: $spacing-sm $spacing-md;
	background: $background;
	border-radius: $border-radius;
	border: 1px solid #e0e0e0;
}

.document-name {
	flex: 1;
	font-weight: 500;
	color: $text-primary;
}

.document-actions {
	display: flex;
	gap: $spacing-sm;
}

.btn--danger {
	background: $warning;
	color: white;

	&:hover {
		background: darken($warning, 10%);
	}
}
</style>
