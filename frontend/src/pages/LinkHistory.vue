<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AppButton from '@/components/common/AppButton.vue';
import DataTable from '@/components/common/DataTable.vue';
import Pagination from '@/components/common/Pagination.vue';
import { linkHistoryApi, type LinkHistory } from '@/api/linkHistory';
import { formatDateTime } from '@/utils/helpers';

const loading = ref(false);
const history = ref<LinkHistory[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(25);

const filters = ref({
	linkType: '',
	action: '',
});

const columns = [
	{ key: 'created_at', label: 'Дата', format: 'date' },
	{ key: 'link_type', label: 'Тип связи' },
	{ key: 'action', label: 'Действие' },
	{ key: 'employee_id', label: 'Сотрудник' },
	{ key: 'card_id', label: 'Карта' },
	{ key: 'car_id', label: 'Автомобиль' },
	{ key: 'changed_by', label: 'Изменил' },
];

const getLinkTypeLabel = (type: string) => {
	const labels: Record<string, string> = {
		'employee-card': 'Сотрудник ↔ Карта',
		'employee-car': 'Сотрудник ↔ Авто',
		'card-car': 'Карта ↔ Авто',
	};
	return labels[type] || type;
};

const getActionLabel = (action: string) => {
	const labels: Record<string, string> = {
		assigned: 'Привязано',
		unassigned: 'Отвязано',
		changed: 'Изменено',
	};
	return labels[action] || action;
};

const loadHistory = async () => {
	loading.value = true;
	try {
		const params: any = {
			limit: pageSize.value,
			offset: (currentPage.value - 1) * pageSize.value,
		};

		if (filters.value.linkType) {
			params.linkType = filters.value.linkType;
		}
		if (filters.value.action) {
			params.action = filters.value.action;
		}

		const response = await linkHistoryApi.getAll(params);
		history.value = response.data;
		total.value = response.total;
	} catch (error) {
		console.error('Ошибка загрузки истории:', error);
	} finally {
		loading.value = false;
	}
};

const resetFilters = () => {
	filters.value = {
		linkType: '',
		action: '',
	};
	currentPage.value = 1;
	loadHistory();
};

const handlePageChange = (page: number) => {
	currentPage.value = page;
	loadHistory();
};

const handlePageSizeChange = (size: number) => {
	pageSize.value = size;
	currentPage.value = 1;
	loadHistory();
};

onMounted(() => {
	loadHistory();
});
</script>

<template>
	<div class="link-history-page">
		<div class="page-header">
			<h1>История изменений связей</h1>
			<div class="header-actions">
				<AppButton variant="secondary" @click="resetFilters">Сбросить фильтры</AppButton>
			</div>
		</div>

		<div v-if="loading" class="loading">Загрузка...</div>
		<template v-else>
			<div class="filters card">
				<div class="filter-group">
					<label>Тип связи:</label>
					<select v-model="filters.linkType" @change="loadHistory">
						<option value="">Все типы</option>
						<option value="employee-card">Сотрудник - Карта</option>
						<option value="employee-car">Сотрудник - Автомобиль</option>
						<option value="card-car">Карта - Автомобиль</option>
					</select>
				</div>
				<div class="filter-group">
					<label>Действие:</label>
					<select v-model="filters.action" @change="loadHistory">
						<option value="">Все действия</option>
						<option value="assigned">Привязка</option>
						<option value="unassigned">Отвязка</option>
						<option value="changed">Изменение</option>
					</select>
				</div>
			</div>

			<DataTable
				:data="history"
				:columns="columns"
				:actions="[]"
			>
				<template #empty>
					<div class="table-empty-state">
						<p class="table-empty-state__text">История изменений пуста</p>
						<p class="table-empty-state__hint">Записи появятся при привязке и отвязке карт и автомобилей от сотрудников в разделе «Конструктор связей»</p>
					</div>
				</template>
				<template #cell-link_type="{ value }">
					<span class="link-type-badge">{{ getLinkTypeLabel(value) }}</span>
				</template>
				<template #cell-action="{ value }">
					<span class="action-badge" :class="`action-${value}`">
						{{ getActionLabel(value) }}
					</span>
				</template>
				<template #cell-employee_id="{ value }">
					{{ value?.full_name || '-' }}
				</template>
				<template #cell-card_id="{ value }">
					{{ value?.card_number || '-' }}
				</template>
				<template #cell-car_id="{ value }">
					{{ value ? `${value.brand} ${value.model} (${value.plate_number})` : '-' }}
				</template>
				<template #cell-changed_by="{ value }">
					{{ value?.email || '-' }}
				</template>
				<template #cell-created_at="{ value }">
					{{ formatDateTime(value) }}
				</template>
			</DataTable>

			<Pagination
				v-if="total > 0"
				:current-page="currentPage"
				:page-size="pageSize"
				:total="total"
				@update:current-page="handlePageChange"
				@update:page-size="handlePageSizeChange"
			/>
		</template>
	</div>
</template>

<style scoped lang="scss">
.link-history-page {
	h1 {
		margin-bottom: $spacing-lg;
	}
}

.page-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: $spacing-lg;
}

.filters {
	display: flex;
	gap: $spacing-lg;
	padding: $spacing-md;
	margin-bottom: $spacing-lg;
	flex-wrap: wrap;
}

.filter-group {
	display: flex;
	flex-direction: column;
	gap: $spacing-xs;

	label {
		font-size: $font-size-sm;
		font-weight: 500;
		color: $text-primary;
	}

	select {
		padding: $spacing-sm $spacing-md;
		border: 1px solid #ddd;
		border-radius: $border-radius;
		font-size: $font-size-base;
	}
}

.link-type-badge {
	display: inline-block;
	padding: $spacing-xs $spacing-sm;
	background: rgba($primary-color, 0.1);
	color: $primary-color;
	border-radius: $border-radius-sm;
	font-size: $font-size-sm;
	font-weight: 500;
}

.action-badge {
	display: inline-block;
	padding: $spacing-xs $spacing-sm;
	border-radius: $border-radius-sm;
	font-size: $font-size-sm;
	font-weight: 500;

	&.action-assigned {
		background: rgba(#27ae60, 0.1);
		color: #27ae60;
	}

	&.action-unassigned {
		background: rgba(#e74c3c, 0.1);
		color: #e74c3c;
	}

	&.action-changed {
		background: rgba(#f39c12, 0.1);
		color: #f39c12;
	}
}

.no-results {
	padding: $spacing-xl;
	text-align: center;
	color: #666;
}
</style>
