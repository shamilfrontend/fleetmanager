<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AppButton from '@/components/common/AppButton.vue';
import Breadcrumbs from '@/components/common/Breadcrumbs.vue';
import Modal from '@/components/common/Modal.vue';
import Confirm from '@/components/common/Confirm.vue';
import FormField from '@/components/common/FormField.vue';
import AppSelect from '@/components/common/AppSelect.vue';
import { useConfirm } from '@/composables/useConfirm';
import { carsApi } from '@/api/cars';
import { employeesApi } from '@/api/employees';
import { cardsApi } from '@/api/cards';
import { maintenanceApi, type MaintenanceHistory } from '@/api/maintenance';
import { formatDate, formatCurrency, formatNumber, formatCardNumber } from '@/utils/helpers';
import { API_ORIGIN } from '@/utils/constants';
import { toast } from '@/utils/toast';
import { getApiErrorMessage } from '@/utils/apiError';
import { getCarStatusLabel, getServiceTypeLabel, SERVICE_TYPE_LABELS } from '@/utils/labels';
import type { Car, Employee, Card } from '@/types';

const serviceTypeOptions = Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const confirm = useConfirm();

const car = ref<Car | null>(null);
const assignedEmployee = ref<Employee | null>(null);
const assignedCard = ref<Card | null>(null);
const maintenanceHistory = ref<MaintenanceHistory[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const showPhotoUpload = ref(false);
const showDocumentUpload = ref(false);
const showMaintenanceForm = ref(false);
const showPhotoGallery = ref(false);
const currentPhotoIndex = ref(0);
const uploadingPhoto = ref(false);
const uploadingDocument = ref(false);
const photoInput = ref<HTMLInputElement | null>(null);
const documentInput = ref<HTMLInputElement | null>(null);
const selectedPhotoFile = ref<File | null>(null);
const selectedDocumentFile = ref<File | null>(null);

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

const canEdit = computed(() => authStore.isAdmin || authStore.isManager);

const breadcrumbItems = computed(() => {
	const c = car.value;
	if (!c) return [];
	return [
		{ label: 'Гараж', to: '/cars' },
		{ label: `${c.brand} ${c.model}` },
	];
});

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

const openDocumentUrl = (doc: string) => {
	const url = getDocumentUrl(doc);
	if (url && typeof window !== 'undefined') {
		window.open(url, '_blank');
	}
};

const getDocumentSize = (_docPath: string) =>
// В реальном приложении можно получить размер файла с сервера
	'PDF';

const editCar = () => {
	router.push({ name: 'Cars', query: { edit: car.value?._id } });
};

const deleteCar = () => {
	if (!car.value?._id) return;
	const carId = car.value._id;
	confirm.openConfirm('Удалить автомобиль? Это действие нельзя отменить.', {
		onConfirm: async () => {
			try {
				await carsApi.delete(carId);
				toast.success('Автомобиль удалён');
				router.push({ name: 'Cars' });
			} catch (e: unknown) {
				toast.error(getApiErrorMessage(e));
			}
		},
	});
};

const loadCarData = async () => {
	const carId = route.params.id as string;
	if (!carId) {
		error.value = 'ID автомобиля не указан';
		loading.value = false;
		return;
	}

	loading.value = true;
	error.value = null;

	try {
		const [carData, maintenance] = await Promise.all([
			carsApi.getById(carId),
			maintenanceApi.getAll({ carId }).catch(() => []),
		]);

		car.value = carData;
		maintenanceHistory.value = maintenance;

		// Загружаем данные о привязках (assigned_to может быть id или объект при populate)
		if (carData.assigned_to) {
			const employeeRef = carData.assigned_to;
			if (typeof employeeRef === 'object' && employeeRef !== null && '_id' in employeeRef) {
				assignedEmployee.value = employeeRef as Employee;
			} else {
				try {
					const id = typeof employeeRef === 'string' ? employeeRef : String(employeeRef);
					assignedEmployee.value = await employeesApi.getById(id);
				} catch (e) {
					console.error('Ошибка загрузки сотрудника:', e);
				}
			}
		}

		// Ищем карту, привязанную к этому автомобилю
		try {
			const cardsResponse = await cardsApi.getAll();
			const cardsList = cardsResponse?.data ?? [];
			assignedCard.value = (Array.isArray(cardsList) ? cardsList : []).find((c) => c.assigned_car === carId) || null;
		} catch (e) {
			console.error('Ошибка загрузки карт:', e);
		}
	} catch (err: unknown) {
		error.value = getApiErrorMessage(err);
		console.error('Ошибка загрузки данных:', err);
	} finally {
		loading.value = false;
	}
};

const onPhotoFileSelect = (event: Event) => {
	const target = event.target as HTMLInputElement;
	selectedPhotoFile.value = target.files?.[0] || null;
};

const onDocumentFileSelect = (event: Event) => {
	const target = event.target as HTMLInputElement;
	selectedDocumentFile.value = target.files?.[0] || null;
};

const handlePhotoUpload = async () => {
	if (!selectedPhotoFile.value || !car.value) return;

	uploadingPhoto.value = true;
	try {
		const result = await carsApi.uploadPhoto(car.value._id, selectedPhotoFile.value);
		car.value.photos = result.car.photos || [];
		toast.success('Фотография загружена');
		showPhotoUpload.value = false;
		selectedPhotoFile.value = null;
		if (photoInput.value) photoInput.value.value = '';
	} catch (error: unknown) {
		toast.error(getApiErrorMessage(error));
	} finally {
		uploadingPhoto.value = false;
	}
};

const handleDocumentUpload = async () => {
	if (!selectedDocumentFile.value || !car.value) return;

	uploadingDocument.value = true;
	try {
		const result = await carsApi.uploadDocument(car.value._id, selectedDocumentFile.value);
		car.value.documents = result.car.documents || [];
		toast.success('Документ загружен');
		showDocumentUpload.value = false;
		selectedDocumentFile.value = null;
		if (documentInput.value) documentInput.value.value = '';
	} catch (error: unknown) {
		toast.error(getApiErrorMessage(error));
	} finally {
		uploadingDocument.value = false;
	}
};

const deletePhoto = (photoPath: string) => {
	if (!car.value) return;
	const carId = car.value._id;
	confirm.openConfirm('Удалить фотографию?', {
		onConfirm: async () => {
			try {
				await carsApi.deletePhoto(carId, photoPath);
				if (car.value) car.value.photos = car.value.photos?.filter((p) => p !== photoPath) || [];
				toast.success('Фотография удалена');
			} catch (error: unknown) {
				toast.error(getApiErrorMessage(error));
			}
		},
	});
};

const deleteDocument = (documentPath: string) => {
	if (!car.value) return;
	const carId = car.value._id;
	confirm.openConfirm('Удалить документ?', {
		onConfirm: async () => {
			try {
				await carsApi.deleteDocument(carId, documentPath);
				if (car.value) car.value.documents = car.value.documents?.filter((d) => d !== documentPath) || [];
				toast.success('Документ удален');
			} catch (error: unknown) {
				toast.error(getApiErrorMessage(error));
			}
		},
	});
};

const openPhotoGallery = (index: number) => {
	currentPhotoIndex.value = index;
	showPhotoGallery.value = true;
};

const closePhotoGallery = () => {
	showPhotoGallery.value = false;
};

const prevPhoto = () => {
	if (!car.value || !car.value.photos) return;
	currentPhotoIndex.value = currentPhotoIndex.value > 0
		? currentPhotoIndex.value - 1
		: car.value.photos.length - 1;
};

const nextPhoto = () => {
	if (!car.value || !car.value.photos) return;
	currentPhotoIndex.value = currentPhotoIndex.value < car.value.photos.length - 1
		? currentPhotoIndex.value + 1
		: 0;
};

const handleSaveMaintenance = async () => {
	if (!car.value) return;

	try {
		await maintenanceApi.create({
			...maintenanceForm.value,
			car_id: car.value._id,
		});
		toast.success('Запись ТО добавлена');
		await loadCarData();
		showMaintenanceForm.value = false;
		maintenanceForm.value = {
			service_type: 'regular',
			description: '',
			cost: 0,
			mileage: car.value.mileage || 0,
			service_date: new Date().toISOString().split('T')[0],
			next_service_date: '',
			next_service_mileage: undefined,
			service_provider: '',
		};
	} catch (error: unknown) {
		toast.error(getApiErrorMessage(error));
	}
};

onMounted(() => {
	loadCarData();
});
</script>

<template>
	<div class="car-detail-page">
		<div v-if="loading" class="loading" role="status" aria-live="polite" aria-label="Загрузка данных">Загрузка данных...</div>
		<div v-else-if="error" class="error">{{ error }}</div>
		<template v-else-if="car">
			<Breadcrumbs :items="breadcrumbItems" />
			<div class="page-header">
				<div class="header-content">
					<AppButton variant="secondary" outline @click="$router.push({ name: 'Cars' })">
						← Назад к списку
					</AppButton>
					<h1>{{ car.brand }} {{ car.model }}</h1>
					<p class="plate-number">{{ car.plate_number }}</p>
				</div>
				<div class="header-actions">
					<AppButton variant="secondary" @click="editCar">Изменить</AppButton>
					<AppButton variant="danger" @click="deleteCar">Удалить</AppButton>
				</div>
			</div>

			<!-- Основная информация -->
			<div class="info-grid">
				<div class="info-card card">
					<h2>Основная информация</h2>
					<div class="info-list">
						<div class="info-item">
							<span class="info-label">Марка:</span>
							<span class="info-value">{{ car.brand }}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Модель:</span>
							<span class="info-value">{{ car.model }}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Гос. номер:</span>
							<span class="info-value">{{ car.plate_number }}</span>
						</div>
						<div class="info-item">
							<span class="info-label">VIN:</span>
							<span class="info-value">{{ car.vin }}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Год выпуска:</span>
							<span class="info-value">{{ car.year }}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Пробег:</span>
							<span class="info-value">{{ formatNumber(car.mileage) }} км</span>
						</div>
						<div class="info-item">
							<span class="info-label">Статус:</span>
							<span class="info-value">
								<span class="status-badge" :class="`status-${car.status}`">
									{{ getCarStatusLabel(car.status) }}
								</span>
							</span>
						</div>
						<div class="info-item" v-if="car.last_service">
							<span class="info-label">Последнее ТО:</span>
							<span class="info-value">{{ formatDate(car.last_service) }}</span>
						</div>
					</div>
				</div>

				<!-- Связи -->
				<div class="info-card card">
					<h2>Связи</h2>
					<div class="info-list">
						<div class="info-item" v-if="assignedEmployee">
							<span class="info-label">Сотрудник:</span>
							<span class="info-value">
								<router-link :to="`/employees/${assignedEmployee._id}`" class="link">
									{{ assignedEmployee.full_name }}
								</router-link>
							</span>
						</div>
						<div class="info-item" v-else>
							<span class="info-label">Сотрудник:</span>
							<span class="info-value text-muted">Не назначен</span>
						</div>
						<div class="info-item" v-if="assignedCard">
							<span class="info-label">Карта:</span>
							<span class="info-value">
								<router-link :to="`/cards/${assignedCard._id}`" class="link">
									{{ formatCardNumber(assignedCard.card_number) }}
								</router-link>
							</span>
						</div>
						<div class="info-item" v-else>
							<span class="info-label">Карта:</span>
							<span class="info-value text-muted">Не назначена</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Фотографии -->
			<div class="card photos-section">
				<div class="section-header">
					<h2>Фотографии</h2>
					<AppButton
						v-if="canEdit"
						size="sm"
						variant="secondary"
						@click="showPhotoUpload = true"
					>
						Добавить фото
					</AppButton>
				</div>
				<div v-if="car.photos && car.photos.length > 0" class="photos-grid">
					<div
						v-for="(photo, index) in car.photos"
						:key="index"
						class="photo-item"
						@click="openPhotoGallery(index)"
					>
						<img :src="getPhotoUrl(photo)" :alt="`${car.brand} ${car.model}`" />
						<div class="photo-overlay">
							<AppButton
								v-if="canEdit"
								size="sm"
								variant="danger"
								@click.stop="deletePhoto(photo)"
							>
								Удалить
							</AppButton>
						</div>
					</div>
				</div>
				<div v-else class="empty-state">
					<p>Нет фотографий</p>
					<AppButton
						v-if="canEdit"
						variant="secondary"
						@click="showPhotoUpload = true"
					>
						Добавить первую фотографию
					</AppButton>
				</div>
			</div>

			<!-- Документы -->
			<div class="card documents-section">
				<div class="section-header">
					<h2>Документы</h2>
					<AppButton
						v-if="canEdit"
						size="sm"
						variant="secondary"
						@click="showDocumentUpload = true"
					>
						Добавить документ
					</AppButton>
				</div>
				<div v-if="car.documents && car.documents.length > 0" class="documents-list">
					<div
						v-for="(doc, index) in car.documents"
						:key="index"
						class="document-item"
					>
						<div class="document-icon">📄</div>
						<div class="document-info">
							<div class="document-name">{{ getDocumentName(doc) }}</div>
							<div class="document-size">{{ getDocumentSize(doc) }}</div>
						</div>
						<div class="document-actions">
							<AppButton
								size="sm"
								variant="secondary"
								@click="openDocumentUrl(doc)"
							>
								Скачать
							</AppButton>
							<AppButton
								v-if="canEdit"
								size="sm"
								variant="danger"
								@click="deleteDocument(doc)"
							>
								Удалить
							</AppButton>
						</div>
					</div>
				</div>
				<div v-else class="empty-state">
					<p>Нет документов</p>
					<AppButton
						v-if="canEdit"
						variant="secondary"
						@click="showDocumentUpload = true"
					>
						Добавить первый документ
					</AppButton>
				</div>
			</div>

			<!-- История ТО -->
			<div class="card maintenance-section">
				<div class="section-header">
					<h2>История ТО</h2>
					<AppButton
						v-if="canEdit"
						size="sm"
						variant="secondary"
						@click="showMaintenanceForm = true"
					>
						Добавить запись ТО
					</AppButton>
				</div>
				<div v-if="maintenanceHistory.length > 0" class="maintenance-list">
					<div
						v-for="(item, index) in maintenanceHistory"
						:key="index"
						class="maintenance-item"
					>
						<div class="maintenance-item-header">
							<span class="service-type">{{ getServiceTypeLabel(item.service_type) }}</span>
							<span class="service-date">{{ formatDate(item.service_date) }}</span>
						</div>
						<div class="maintenance-item-body">
							<p>{{ item.description }}</p>
							<div class="maintenance-item-details">
								<span>Стоимость: {{ formatCurrency(item.cost) }}</span>
								<span>Пробег: {{ formatNumber(item.mileage) }} км</span>
								<span v-if="item.service_provider">Сервис: {{ item.service_provider }}</span>
							</div>
							<div v-if="item.next_service_date || item.next_service_mileage" class="next-service">
								<span v-if="item.next_service_date">
									Следующее ТО: {{ formatDate(item.next_service_date) }}
								</span>
								<span v-if="item.next_service_mileage">
									Следующее ТО по пробегу: {{ formatNumber(item.next_service_mileage) }} км
								</span>
							</div>
						</div>
					</div>
				</div>
				<div v-else class="empty-state">
					<p>Нет записей ТО</p>
				</div>
			</div>

			<!-- Оборудование -->
			<div v-if="car.equipment && car.equipment.length > 0" class="card equipment-section">
				<h2>Оборудование</h2>
				<div class="equipment-list">
					<div
						v-for="(item, index) in car.equipment"
						:key="index"
						class="equipment-item"
					>
						<div class="equipment-name">{{ item.name }}</div>
						<div class="equipment-details">
							<span>Серийный номер: {{ item.serial_number }}</span>
							<span v-if="item.installed_date">
								Установлено: {{ formatDate(item.installed_date) }}
							</span>
						</div>
					</div>
				</div>
			</div>
		</template>

		<!-- Модальное окно загрузки фотографии -->
		<Modal
			v-model:is-open="showPhotoUpload"
			title="Загрузить фотографию"
			@confirm="handlePhotoUpload"
		>
			<input
				type="file"
				ref="photoInput"
				accept="image/*"
				@change="onPhotoFileSelect"
				style="display: none"
			/>
			<div class="upload-content">
				<AppButton
					variant="secondary"
					:disabled="uploadingPhoto"
					@click="() => photoInput?.click()"
				>
					{{ uploadingPhoto ? 'Загрузка...' : 'Выбрать файл' }}
				</AppButton>
				<p v-if="selectedPhotoFile" class="file-name">{{ selectedPhotoFile.name }}</p>
			</div>
		</Modal>

		<!-- Модальное окно загрузки документа -->
		<Modal
			v-model:is-open="showDocumentUpload"
			title="Загрузить документ"
			@confirm="handleDocumentUpload"
		>
			<input
				type="file"
				ref="documentInput"
				accept=".pdf"
				@change="onDocumentFileSelect"
				style="display: none"
			/>
			<div class="upload-content">
				<AppButton
					variant="secondary"
					:disabled="uploadingDocument"
					@click="() => documentInput?.click()"
				>
					{{ uploadingDocument ? 'Загрузка...' : 'Выбрать файл' }}
				</AppButton>
				<p v-if="selectedDocumentFile" class="file-name">{{ selectedDocumentFile.name }}</p>
			</div>
		</Modal>

		<!-- Модальное окно добавления ТО -->
		<Modal
			v-model:is-open="showMaintenanceForm"
			title="Добавить запись ТО"
			@confirm="handleSaveMaintenance"
		>
			<form class="maintenance-form">
				<FormField label="Тип обслуживания" required field-id="maint-service_type">
					<AppSelect
						field-id="maint-service_type"
						v-model="maintenanceForm.service_type"
						:options="serviceTypeOptions"
						placeholder="Выберите тип"
					/>
				</FormField>
				<FormField label="Описание" required field-id="maint-description">
					<textarea id="maint-description" v-model="maintenanceForm.description" required></textarea>
				</FormField>
				<div class="form-row">
					<FormField label="Стоимость" required field-id="maint-cost">
						<input id="maint-cost" type="number" v-model.number="maintenanceForm.cost" min="0" required />
					</FormField>
					<FormField label="Пробег" required field-id="maint-mileage">
						<input id="maint-mileage" type="number" v-model.number="maintenanceForm.mileage" min="0" required />
					</FormField>
				</div>
				<div class="form-row">
					<FormField label="Дата обслуживания" required field-id="maint-service_date">
						<input id="maint-service_date" type="date" v-model="maintenanceForm.service_date" required />
					</FormField>
					<FormField label="Следующее ТО (дата)" field-id="maint-next_service_date">
						<input id="maint-next_service_date" type="date" v-model="maintenanceForm.next_service_date" />
					</FormField>
				</div>
				<div class="form-row">
					<FormField label="Следующее ТО (пробег, км)" field-id="maint-next_service_mileage">
						<input id="maint-next_service_mileage" type="number" v-model.number="maintenanceForm.next_service_mileage" min="0" />
					</FormField>
					<FormField label="Сервис" field-id="maint-service_provider">
						<input id="maint-service_provider" type="text" v-model="maintenanceForm.service_provider" />
					</FormField>
				</div>
			</form>
		</Modal>

		<!-- Галерея фотографий -->
		<div v-if="showPhotoGallery" class="photo-gallery-overlay" @click="closePhotoGallery">
			<div class="gallery-content" @click.stop>
				<button class="gallery-close" @click="closePhotoGallery">×</button>
				<button class="gallery-nav gallery-prev" @click="prevPhoto">‹</button>
				<img :src="getPhotoUrl(car!.photos[currentPhotoIndex])" alt="Gallery" />
				<button class="gallery-nav gallery-next" @click="nextPhoto">›</button>
				<div class="gallery-info">
					{{ currentPhotoIndex + 1 }} / {{ car!.photos.length }}
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
	</div>
</template>

<style scoped lang="scss">
.car-detail-page {
	display: flex;
	flex-direction: column;
	gap: $spacing-lg;
}

.page-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: $spacing-lg;
}

.header-content {
	flex: 1;
}

.header-content h1 {
	margin: $spacing-sm 0;
	font-size: $font-size-2xl;
	color: $text-primary;
}

.plate-number {
	font-size: $font-size-lg;
	color: #666;
	font-weight: 500;
}

.info-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	gap: $spacing-lg;
}

.info-card {
	h2 {
		margin-bottom: $spacing-md;
		font-size: $font-size-lg;
		color: $text-primary;
	}
}

.info-list {
	display: flex;
	flex-direction: column;
	gap: $spacing-md;
}

.info-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-bottom: $spacing-sm;
	border-bottom: 1px solid #e0e0e0;

	&:last-child {
		border-bottom: none;
	}
}

.info-label {
	font-weight: 500;
	color: #666;
}

.info-value {
	color: $text-primary;
	text-align: right;
}

.text-muted {
	color: #999;
}

.link {
	color: $primary-color;
	text-decoration: none;

	&:hover {
		text-decoration: underline;
	}
}

.status-badge {
	padding: $spacing-xs $spacing-sm;
	border-radius: $border-radius-sm;
	font-size: $font-size-xs;
	font-weight: 600;

	&.status-active {
		background: rgba(#27ae60, 0.1);
		color: #27ae60;
	}

	&.status-repair {
		background: rgba(#e74c3c, 0.1);
		color: #e74c3c;
	}

	&.status-reserve {
		background: rgba(#f39c12, 0.1);
		color: #f39c12;
	}
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: $spacing-md;

	h2 {
		margin: 0;
		font-size: $font-size-lg;
		color: $text-primary;
	}
}

.photos-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: $spacing-md;
}

.photo-item {
	position: relative;
	cursor: pointer;
	border-radius: $border-radius;
	overflow: hidden;
	transition: transform $transition-fast;

	&:hover {
		transform: scale(1.02);

		.photo-overlay {
			opacity: 1;
		}
	}

	img {
		width: 100%;
		height: 200px;
		object-fit: cover;
		display: block;
	}
}

.photo-overlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0;
	transition: opacity $transition-fast;
}

.documents-list {
	display: flex;
	flex-direction: column;
	gap: $spacing-sm;
}

.document-item {
	display: flex;
	align-items: center;
	gap: $spacing-md;
	padding: $spacing-md;
	background: $background;
	border-radius: $border-radius;
	border: 1px solid #e0e0e0;
}

.document-icon {
	font-size: $font-size-2xl;
}

.document-info {
	flex: 1;
}

.document-name {
	font-weight: 500;
	color: $text-primary;
}

.document-size {
	font-size: $font-size-sm;
	color: #666;
	margin-top: $spacing-xs;
}

.document-actions {
	display: flex;
	gap: $spacing-sm;
}

.maintenance-list {
	display: flex;
	flex-direction: column;
	gap: $spacing-md;
}

.maintenance-item {
	padding: $spacing-md;
	background: $background;
	border-radius: $border-radius;
	border-left: 3px solid $primary-color;
}

.maintenance-item-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: $spacing-sm;
}

.service-type {
	font-weight: 600;
	color: $primary-color;
}

.service-date {
	color: #666;
	font-size: $font-size-sm;
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

.equipment-list {
	display: flex;
	flex-direction: column;
	gap: $spacing-md;
}

.equipment-item {
	padding: $spacing-md;
	background: $background;
	border-radius: $border-radius;
	border: 1px solid #e0e0e0;
}

.equipment-name {
	font-weight: 600;
	color: $text-primary;
	margin-bottom: $spacing-xs;
}

.equipment-details {
	display: flex;
	gap: $spacing-md;
	font-size: $font-size-sm;
	color: #666;
}

.empty-state {
	text-align: center;
	padding: $spacing-xl;
	color: #666;
}

.upload-content {
	display: flex;
	flex-direction: column;
	gap: $spacing-md;
	align-items: center;
}

.file-name {
	font-size: $font-size-sm;
	color: #666;
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

.photo-gallery-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.9);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
}

.gallery-content {
	position: relative;
	max-width: 90vw;
	max-height: 90vh;
	display: flex;
	align-items: center;
	justify-content: center;
}

.gallery-content img {
	max-width: 100%;
	max-height: 90vh;
	object-fit: contain;
}

.gallery-close {
	position: absolute;
	top: -40px;
	right: 0;
	background: none;
	border: none;
	color: white;
	font-size: 40px;
	cursor: pointer;
	line-height: 1;
	padding: 0;
	width: 40px;
	height: 40px;
}

.gallery-nav {
	position: absolute;
	top: 50%;
	transform: translateY(-50%);
	background: rgba(255, 255, 255, 0.2);
	border: none;
	color: white;
	font-size: 60px;
	cursor: pointer;
	padding: 0 20px;
	line-height: 1;
	transition: background $transition-fast;

	&:hover {
		background: rgba(255, 255, 255, 0.3);
	}
}

.gallery-prev {
	left: -80px;
}

.gallery-next {
	right: -80px;
}

.gallery-info {
	position: absolute;
	bottom: -40px;
	left: 50%;
	transform: translateX(-50%);
	color: white;
	font-size: $font-size-sm;
}

.loading,
.error {
	padding: $spacing-xl;
	text-align: center;
	color: #666;
}

.error {
	color: #e74c3c;
}
</style>
