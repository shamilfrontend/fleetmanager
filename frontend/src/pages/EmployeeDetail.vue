<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { employeesApi } from '@/api/employees';
import { toast } from '@/utils/toast';
import { getApiErrorMessage } from '@/utils/apiError';
import AppButton from '@/components/common/AppButton.vue';
import Confirm from '@/components/common/Confirm.vue';
import Breadcrumbs from '@/components/common/Breadcrumbs.vue';
import { useConfirm } from '@/composables/useConfirm';
import type { Employee } from '@/types';

const route = useRoute();
const router = useRouter();
const confirm = useConfirm();

const loading = ref(true);
const error = ref('');
const employee = ref<Employee | null>(null);

const breadcrumbItems = computed(() => {
	const e = employee.value;
	if (!e) return [];
	return [
		{ label: 'Сотрудники', to: '/employees' },
		{ label: e.full_name },
	];
});

const cardId = computed(() => {
	const c = employee.value?.card_id;
	return typeof c === 'object' && c !== null && '_id' in c ? (c as { _id: string })._id : (c as string) || null;
});

const cardNumber = computed(() => {
	const c = employee.value?.card_id;
	if (!c) return '—';
	return typeof c === 'object' && c !== null && 'card_number' in c
		? (c as { card_number: string }).card_number
		: String(c);
});

const assignedCars = computed(() => {
	const cars = employee.value?.assigned_cars;
	if (!cars || !Array.isArray(cars)) return [];
	type CarItem = string | { _id: string; brand?: string; model?: string; plate_number?: string };
	return cars.map((c: CarItem) => (typeof c === 'object' && c !== null && '_id' in c
		? {
			_id: c._id, brand: c.brand ?? '', model: c.model ?? '', plate_number: c.plate_number ?? '',
		}
		: {
			_id: c, brand: '', model: '', plate_number: '',
		})).filter((c): c is { _id: string } => Boolean(c._id));
});

const formatDate = (dateStr: string | undefined) => {
	if (!dateStr) return '—';
	return new Date(dateStr).toLocaleDateString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	});
};

const loadEmployee = async () => {
	const id = route.params.id as string;
	if (!id) return;
	loading.value = true;
	error.value = '';
	try {
		employee.value = await employeesApi.getById(id);
	} catch (e: unknown) {
		error.value = getApiErrorMessage(e);
		employee.value = null;
	} finally {
		loading.value = false;
	}
};

const editEmployee = () => {
	if (employee.value?._id) {
		router.push({ name: 'Employees', query: { edit: employee.value._id } });
	} else {
		router.push({ name: 'Employees' });
	}
};

const deleteEmployee = () => {
	if (!employee.value?._id) return;
	const id = employee.value._id;
	confirm.openConfirm('Удалить сотрудника? Это действие нельзя отменить.', {
		onConfirm: async () => {
			try {
				await employeesApi.delete(id);
				toast.success('Сотрудник удалён');
				router.push({ name: 'Employees' });
			} catch (e: unknown) {
				toast.error(getApiErrorMessage(e));
			}
		},
	});
};

watch(() => route.params.id, loadEmployee, { immediate: true });
</script>

<template>
	<div class="employee-detail-page">
		<Breadcrumbs v-if="employee" :items="breadcrumbItems" />
		<div v-if="loading" class="loading" role="status" aria-live="polite" aria-label="Загрузка данных">Загрузка данных...</div>
		<div v-else-if="error" class="error">{{ error }}</div>
		<template v-else-if="employee">
			<div class="page-header">
				<div class="header-content">
					<AppButton variant="secondary" outline @click="$router.push({ name: 'Employees' })">
						← Назад к списку
					</AppButton>
					<h1>{{ employee.full_name }}</h1>
					<p class="position-subtitle">{{ employee.position }}, {{ employee.department }}</p>
				</div>
				<div class="header-actions">
					<AppButton variant="secondary" @click="editEmployee">Изменить</AppButton>
					<AppButton variant="danger" @click="deleteEmployee">Удалить</AppButton>
				</div>
			</div>

			<div class="info-grid">
				<div class="info-card card">
					<h2>Основная информация</h2>
					<div class="info-list">
						<div class="info-item">
							<span class="info-label">ФИО:</span>
							<span class="info-value">{{ employee.full_name }}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Должность:</span>
							<span class="info-value">{{ employee.position }}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Отдел:</span>
							<span class="info-value">{{ employee.department }}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Телефон:</span>
							<span class="info-value">{{ employee.phone }}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Дата найма:</span>
							<span class="info-value">{{ formatDate(employee.hire_date) }}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Статус:</span>
							<span class="info-value">
								<span class="status-badge" :class="`status-${employee.status}`">
									{{ employee.status === 'active' ? 'Активен' : 'Неактивен' }}
								</span>
							</span>
						</div>
					</div>
				</div>

				<div class="info-card card">
					<h2>Связи</h2>
					<div class="info-list">
						<div class="info-item">
							<span class="info-label">Карта:</span>
							<span class="info-value">
								<router-link v-if="cardId" :to="`/cards/${cardId}`" class="link">
									{{ cardNumber }}
								</router-link>
								<span v-else class="text-muted">Не назначена</span>
							</span>
						</div>
						<div class="info-item info-item--block">
							<span class="info-label">Автомобили:</span>
							<span class="info-value">
								<div v-if="assignedCars.length > 0" class="cars-list">
									<router-link
										v-for="car in assignedCars"
										:key="car._id"
										:to="`/cars/${car._id}`"
										class="car-link"
									>
										{{ car.brand }} {{ car.model }} ({{ car.plate_number }})
									</router-link>
								</div>
								<span v-else class="text-muted">Нет закреплённых</span>
							</span>
						</div>
					</div>
				</div>
			</div>
		</template>
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
.employee-detail-page {
	padding-bottom: $spacing-xl;
}

.loading,
.error {
	padding: $spacing-xl;
	text-align: center;
}

.error {
	color: $warning;
}

.page-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: $spacing-lg;
	flex-wrap: wrap;
	gap: $spacing-md;
}

.header-content {
	.btn--text {
		display: inline-block;
		margin-bottom: $spacing-sm;
		color: $primary-color;
		background: none;
		border: none;
		cursor: pointer;
		font-size: $font-size-base;
		padding: 0;
	}

	h1 {
		margin: 0 0 $spacing-xs;
		font-size: $font-size-2xl;
		color: $text-primary;
	}
}

.position-subtitle {
	margin: 0;
	color: #666;
	font-size: $font-size-base;
}

.info-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
	gap: $spacing-lg;
}

.info-card {
	padding: $spacing-lg;

	h2 {
		margin: 0 0 $spacing-md;
		font-size: $font-size-lg;
		color: $text-primary;
	}
}

.info-list {
	display: flex;
	flex-direction: column;
	gap: $spacing-sm;
}

.info-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: $spacing-xs 0;
	border-bottom: 1px solid #f0f0f0;

	&:last-child {
		border-bottom: none;
	}
}

.info-label {
	color: #666;
	margin-right: $spacing-sm;
}

.info-value {
	font-weight: 500;
	color: $text-primary;
}

.status-badge {
	display: inline-block;
	padding: $spacing-xs $spacing-sm;
	border-radius: $border-radius-sm;
	font-size: $font-size-sm;

	&.status-active {
		background: rgba($success, 0.15);
		color: darken($success, 10%);
	}

	&.status-inactive {
		background: rgba(#666, 0.1);
		color: #666;
	}
}

.empty-state {
	padding: $spacing-lg;
	text-align: center;
	color: #666;
	background: $background;
	border-radius: $border-radius;
}

.cars-list {
	display: flex;
	flex-direction: column;
	gap: $spacing-sm;
}

.car-link {
	padding: $spacing-sm $spacing-md;
	background: $background;
	border-radius: $border-radius;
	color: $primary-color;
	text-decoration: none;
	transition: background $transition-fast;

	&:hover {
		background: rgba($primary-color, 0.08);
	}
}

.link {
	color: $primary-color;
	text-decoration: none;

	&:hover {
		text-decoration: underline;
	}
}

.text-muted {
	color: #666;
}

.info-item--block .info-value {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
}
</style>
