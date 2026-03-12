<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { cardsApi } from '@/api/cards';
import AppButton from '@/components/common/AppButton.vue';
import Confirm from '@/components/common/Confirm.vue';
import Breadcrumbs from '@/components/common/Breadcrumbs.vue';
import { useConfirm } from '@/composables/useConfirm';
import { formatCurrency } from '@/utils/helpers';
import { toast } from '@/utils/toast';
import type { Card } from '@/types';

const route = useRoute();
const router = useRouter();
const confirm = useConfirm();

const loading = ref(true);
const error = ref('');
const card = ref<Card | null>(null);

const breadcrumbItems = computed(() => {
	const c = card.value;
	if (!c) return [];
	return [
		{ label: 'Топливные карты', to: '/cards' },
		{ label: c.card_number },
	];
});

const assignedEmployeeId = computed(() => {
	const a = card.value?.assigned_to;
	if (!a) return null;
	return typeof a === 'object' && a !== null && '_id' in a ? (a as { _id: string })._id : (a as string);
});

const assignedEmployeeName = computed(() => {
	const a = card.value?.assigned_to;
	if (!a) return '';
	return typeof a === 'object' && a !== null && 'full_name' in a ? (a as { full_name: string }).full_name : String(a);
});

const assignedCarId = computed(() => {
	const c = card.value?.assigned_car;
	if (!c) return null;
	return typeof c === 'object' && c !== null && '_id' in c ? (c as { _id: string })._id : (c as string);
});

const assignedCar = computed(() => {
	const c = card.value?.assigned_car;
	if (!c || typeof c !== 'object') return null;
	const o = c as { _id?: string; brand?: string; model?: string; plate_number?: string };
	return o._id ? {
		_id: o._id, brand: o.brand || '', model: o.model || '', plate_number: o.plate_number || '',
	} : null;
});

const getStatusLabel = (status: string) => {
	const labels: Record<string, string> = {
		active: 'Активна',
		blocked: 'Заблокирована',
		expired: 'Истекла',
	};
	return labels[status] || status;
};

const formatDate = (dateStr: string | undefined) => {
	if (!dateStr) return '—';
	return new Date(dateStr).toLocaleDateString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	});
};

const loadCard = async () => {
	const id = route.params.id as string;
	if (!id) return;
	loading.value = true;
	error.value = '';
	try {
		card.value = await cardsApi.getById(id);
	} catch (e: any) {
		error.value = e?.response?.data?.message || 'Не удалось загрузить данные';
		card.value = null;
	} finally {
		loading.value = false;
	}
};

const editCard = () => {
	if (card.value?._id) {
		router.push({ name: 'Cards', query: { edit: card.value._id } });
	} else {
		router.push({ name: 'Cards' });
	}
};

const deleteCard = () => {
	if (!card.value?._id) return;
	const id = card.value._id;
	confirm.openConfirm('Удалить карту? Это действие нельзя отменить.', {
		onConfirm: async () => {
			try {
				await cardsApi.delete(id);
				toast.success('Карта удалена');
				router.push({ name: 'Cards' });
			} catch (e: any) {
				toast.error(e?.response?.data?.message || 'Ошибка удаления');
			}
		},
	});
};

watch(() => route.params.id, loadCard, { immediate: true });
</script>

<template>
	<div class="card-detail-page">
		<Breadcrumbs v-if="card" :items="breadcrumbItems" />
		<div v-if="loading" class="loading">Загрузка данных...</div>
		<div v-else-if="error" class="error">{{ error }}</div>
		<template v-else-if="card">
			<div class="page-header">
				<div class="header-content">
					<AppButton variant="secondary" outline @click="$router.push({ name: 'Cards' })">
						← Назад к списку
					</AppButton>
					<h1>{{ card.card_number }}</h1>
					<p class="type-subtitle">{{ card.type === 'fuel' ? 'Топливная карта' : 'Сервисная карта' }}</p>
				</div>
				<div class="header-actions">
					<AppButton variant="secondary" @click="editCard">Изменить</AppButton>
					<AppButton variant="danger" @click="deleteCard">Удалить</AppButton>
				</div>
			</div>

			<div class="info-grid">
				<div class="info-card card">
					<h2>Основная информация</h2>
					<div class="info-list">
						<div class="info-item">
							<span class="info-label">Номер карты:</span>
							<span class="info-value">{{ card.card_number }}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Тип:</span>
							<span class="info-value">{{ card.type === 'fuel' ? 'Топливная' : 'Сервисная' }}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Баланс:</span>
							<span class="info-value balance">{{ formatCurrency(card.balance) }}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Лимит:</span>
							<span class="info-value">{{ formatCurrency(card.limit) }}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Статус:</span>
							<span class="info-value">
								<span class="status-badge" :class="`status-${card.status}`">
									{{ getStatusLabel(card.status) }}
								</span>
							</span>
						</div>
						<div class="info-item" v-if="card.expiry_date">
							<span class="info-label">Срок действия:</span>
							<span class="info-value">{{ formatDate(card.expiry_date) }}</span>
						</div>
					</div>
				</div>

				<div class="info-card card">
					<h2>Связи</h2>
					<div class="info-list">
						<div class="info-item">
							<span class="info-label">Сотрудник:</span>
							<span class="info-value">
								<router-link v-if="assignedEmployeeId" :to="`/employees/${assignedEmployeeId}`" class="link">
									{{ assignedEmployeeName }}
								</router-link>
								<span v-else class="text-muted">Не назначен</span>
							</span>
						</div>
						<div class="info-item">
							<span class="info-label">Автомобиль:</span>
							<span class="info-value">
								<router-link v-if="assignedCar" :to="`/cars/${assignedCarId}`" class="link">
									{{ assignedCar.brand }} {{ assignedCar.model }} ({{ assignedCar.plate_number }})
								</router-link>
								<span v-else class="text-muted">Не назначен</span>
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
.card-detail-page {
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

.type-subtitle {
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

	&.balance {
		font-size: $font-size-lg;
		color: $primary-color;
	}
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

	&.status-blocked {
		background: rgba($warning, 0.15);
		color: darken($warning, 15%);
	}

	&.status-expired {
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

.link {
	color: $primary-color;
	text-decoration: none;

	&:hover {
		text-decoration: underline;
	}

	&.link-block {
		display: block;
		padding: $spacing-xs 0;
	}
}

.text-muted {
	color: #666;
}
</style>
