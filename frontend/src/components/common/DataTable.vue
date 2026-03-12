<script setup lang="ts">
import { ref, computed } from 'vue';
import AppButton from '@/components/common/AppButton.vue';

interface Column {
	key: string
	label: string
	format?: 'date' | 'currency' | 'number'
	sortable?: boolean
}

interface Action {
	name: string
	label: string
	handler: (row: any) => void
	type?: 'primary' | 'danger' | 'default'
}

interface Props {
	data: any[]
	columns: Column[]
	actions?: Action[]
	rowIdKey?: string
	selectable?: boolean
	selectedRows?: any[]
}

const props = withDefaults(defineProps<Props>(), {
	actions: () => [],
	rowIdKey: '_id',
	selectable: false,
	selectedRows: () => [],
});

const emit = defineEmits<{
	'update:selectedRows': [rows: any[]]
}>();

// Фильтруем undefined/null значения из данных и проверяем наличие данных
const baseData = computed(() => {
	if (!props.data) return [];
	if (Array.isArray(props.data)) {
		return props.data.filter((row) => row != null && typeof row === 'object');
	}
	return [];
});

const sortColumn = ref<string | null>(null);
const sortDirection = ref<'asc' | 'desc'>('asc');

const handleSort = (columnKey: string) => {
	const column = props.columns.find((col) => col.key === columnKey);
	if (column?.sortable === false) return;

	if (sortColumn.value === columnKey) {
		sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
	} else {
		sortColumn.value = columnKey;
		sortDirection.value = 'asc';
	}
};

const sortedData = computed(() => {
	if (!sortColumn.value) {
		return baseData.value;
	}

	const sorted = [...baseData.value].sort((a, b) => {
		const aValue = a[sortColumn.value!];
		const bValue = b[sortColumn.value!];

		// Обработка null/undefined
		if (aValue == null && bValue == null) return 0;
		if (aValue == null) return 1;
		if (bValue == null) return -1;

		// Определяем тип для сравнения
		let comparison = 0;
		if (typeof aValue === 'number' && typeof bValue === 'number') {
			comparison = aValue - bValue;
		} else if (aValue instanceof Date && bValue instanceof Date) {
			comparison = aValue.getTime() - bValue.getTime();
		} else {
			comparison = String(aValue).localeCompare(String(bValue), 'ru');
		}

		return sortDirection.value === 'asc' ? comparison : -comparison;
	});

	return sorted;
});

const filteredData = computed(() =>
// Дополнительная фильтрация для безопасности
	sortedData.value.filter((row) => row != null && typeof row === 'object'));

const selectedRowsSet = computed(() => new Set(props.selectedRows.map((row) => getRowId(row, 0))));

const isSelected = (row: any) => {
	if (!props.selectable) return false;
	const rowId = getRowId(row, 0);
	return selectedRowsSet.value.has(rowId);
};

const toggleSelect = (row: any) => {
	if (!props.selectable) return;
	const currentSelected = [...props.selectedRows];
	const rowId = getRowId(row, 0);
	const index = currentSelected.findIndex((r) => getRowId(r, 0) === rowId);

	if (index >= 0) {
		currentSelected.splice(index, 1);
	} else {
		currentSelected.push(row);
	}

	emit('update:selectedRows', currentSelected);
};

const allSelected = computed(() => {
	if (!props.selectable || filteredData.value.length === 0) return false;
	return filteredData.value.every((row) => isSelected(row));
});

const someSelected = computed(() => {
	if (!props.selectable) return false;
	return props.selectedRows.length > 0;
});

const toggleSelectAll = () => {
	if (!props.selectable) return;
	if (allSelected.value) {
		emit('update:selectedRows', []);
	} else {
		emit('update:selectedRows', [...filteredData.value]);
	}
};

const getRowId = (row: any, index: number) => {
	if (!row || typeof row !== 'object') {
		return `row-${index}`;
	}
	try {
		const id = row[props.rowIdKey];
		return id != null && id !== undefined ? String(id) : `row-${index}`;
	} catch (error) {
		return `row-${index}`;
	}
};

// Функция для безопасного получения значения ячейки
const getCellValue = (row: any, key: string) => {
	if (!row || typeof row !== 'object') {
		return undefined;
	}

	// Прямой доступ row[key] — работает с обычными объектами и Proxy (Vue reactive)
	const keys = key.split('.');
	if (keys.length === 1) {
		// Прямой доступ к свойству - используем hasOwnProperty для проверки
		if (key in row) {
			return row[key];
		}
		// Если ключа нет, пробуем через Object.hasOwnProperty
		if (Object.prototype.hasOwnProperty.call(row, key)) {
			return row[key];
		}
		return undefined;
	}

	// Вложенные свойства (точечная нотация)
	let value = row;
	for (const k of keys) {
		if (value != null && typeof value === 'object' && k in value) {
			value = value[k];
		} else {
			return undefined;
		}
	}
	return value;
};

// Оптимизированная функция для получения и форматирования значения ячейки
const formatCellValue = (row: any, key: string, format?: string) => {
	const value = getCellValue(row, key);
	return formatValue(value, format);
};

const formatValue = (value: any, format?: string) => {
	// Проверяем на null и undefined
	if (value === null || value === undefined) {
		return '-';
	}

	// Пустая строка возвращает тире
	if (value === '') {
		return '-';
	}

	// Если значение - это объект (например, populate из MongoDB)
	if (typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
		// Если это объект с полем full_name (populate Employee), возвращаем имя
		if (value.full_name) {
			return String(value.full_name);
		}
		// Если это объект с полем brand или model (populate Car), возвращаем марку и модель
		if (value.brand && value.model) {
			return `${value.brand} ${value.model}`;
		}
		if (value.brand) {
			return String(value.brand);
		}
		// Если это объект с полем card_number (populate Card), возвращаем номер карты
		if (value.card_number) {
			return String(value.card_number);
		}
		// Если это объект с полем _id, это скорее всего populate без нужных полей
		if (value._id) {
			return String(value._id);
		}
		// Иначе возвращаем JSON строку (для отладки)
		return JSON.stringify(value);
	}

	if (format === 'date') {
		try {
			const date = new Date(value);
			if (isNaN(date.getTime())) return '-';
			return date.toLocaleDateString('ru-RU');
		} catch {
			return '-';
		}
	}

	if (format === 'currency') {
		try {
			const num = Number(value);
			if (isNaN(num)) return '-';
			return new Intl.NumberFormat('ru-RU', {
				style: 'currency',
				currency: 'RUB',
			}).format(num);
		} catch {
			return '-';
		}
	}

	if (format === 'number') {
		try {
			const num = Number(value);
			if (isNaN(num)) return '-';
			// Для дробных чисел показываем 2 знака после запятой
			if (num % 1 !== 0) {
				return new Intl.NumberFormat('ru-RU', {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
				}).format(num);
			}
			return new Intl.NumberFormat('ru-RU').format(num);
		} catch {
			return '-';
		}
	}

	// Возвращаем значение как строку
	return String(value);
};
</script>

<template>
	<div class="data-table">
		<div v-if="filteredData.length === 0" class="table-empty">
			<slot name="empty">
				<span class="table-empty-text">Нет данных для отображения</span>
			</slot>
		</div>
		<table v-else class="table">
			<thead>
				<tr>
					<th v-if="selectable" class="checkbox-header">
						<input
							type="checkbox"
							:checked="allSelected"
							:indeterminate="someSelected && !allSelected"
							@change="toggleSelectAll"
						/>
					</th>
					<th
						v-for="column in columns"
						:key="column.key"
						class="sortable-header"
						@click="handleSort(column.key)"
					>
						<div class="header-content">
							<span>{{ column.label }}</span>
							<span class="sort-icon">
								<span v-if="sortColumn === column.key">
									{{ sortDirection === 'asc' ? '↑' : '↓' }}
								</span>
								<span v-else class="sort-placeholder">⇅</span>
							</span>
						</div>
					</th>
					<th v-if="actions.length > 0">Действия</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="(row, index) in filteredData" :key="getRowId(row, index)" :class="{ 'selected': isSelected(row) }">
					<template v-if="row">
						<td v-if="selectable" class="checkbox-cell">
							<input
								type="checkbox"
								:checked="isSelected(row)"
								@change="toggleSelect(row)"
							/>
						</td>
						<td v-for="column in columns" :key="column.key">
							<slot
								:name="`cell-${column.key}`"
								:row="row"
								:value="getCellValue(row, column.key)"
							>
								{{ formatCellValue(row, column.key, column.format) }}
							</slot>
						</td>
					</template>
					<td v-if="actions.length > 0" class="actions-cell">
						<AppButton
							v-for="action in actions"
							:key="action.name"
							size="sm"
							:variant="action.type === 'danger' ? 'danger' : action.type === 'primary' ? 'primary' : 'secondary'"
							@click="action.handler(row)"
						>
							{{ action.label }}
						</AppButton>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<style scoped lang="scss">
@import '@/assets/scss/variables.scss';

.data-table {
	background: $bg-elevated;
	border-radius: $radius;
	overflow: hidden;
	box-shadow: $shadow-card;
	border: 1px solid $border-light;
}

.table-empty {
	padding: $spacing-xl;
	text-align: center;
	color: $text-muted;
	background: $bg-elevated;
}

.table-empty-text {
	font-size: $font-size-base;
}

.table {
	width: 100%;
	border-collapse: collapse;
}

thead {
	background-color: $bg-subtle;
}

th {
	padding: $spacing-md;
	text-align: left;
	font-weight: $font-weight-semibold;
	color: $text-primary;
	border-bottom: 2px solid $border-medium;
}

.sortable-header {
	cursor: pointer;
	user-select: none;
	transition: background-color $transition-fast;

	&:hover {
		background-color: $primary-light;
	}
}

.header-content {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: $spacing-xs;
}

.sort-icon {
	font-size: $font-size-sm;
	color: $text-muted;
	min-width: 16px;
}

.sort-placeholder {
	opacity: 0.3;
}

td {
	padding: $spacing-md;
	border-bottom: 1px solid $border-light;
	color: $text-primary;
	vertical-align: middle;
}

tbody tr:hover {
	background-color: $bg-subtle;
}

tbody tr.selected {
	background-color: $primary-light;
}

.checkbox-header,
.checkbox-cell {
	width: 40px;
	text-align: center;
	padding: $spacing-md !important;
}

.checkbox-header input,
.checkbox-cell input {
	cursor: pointer;
	width: 18px;
	height: 18px;
}

.actions-cell {
	display: flex;
	flex-wrap: wrap;
	gap: $spacing-sm;
}
</style>
