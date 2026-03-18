<script setup lang="ts">
import { ref, computed } from 'vue';

import AppButton from '@/components/common/AppButton.vue';
import AppSelect from '@/components/common/AppSelect.vue';
import type { SelectOption } from '@/components/common/AppSelect.vue';
import FormField from '@/components/common/FormField.vue';
import { useConfirm } from '@/composables/useConfirm';
import { employeesApi } from '@/api/employees';
import { cardsApi } from '@/api/cards';
import { carsApi } from '@/api/cars';
import { toast } from '@/utils/toast';
import { getApiErrorMessage } from '@/utils/apiError';
import { formatCardNumber } from '@/utils/helpers';

interface PendingChange {
	type: 'assign' | 'unassign'
	linkType: 'employee-card' | 'employee-car' | 'card-car'
	sourceId: string
	sourceType: 'employee' | 'card' | 'car'
	targetId: string
	targetType: 'employee' | 'card' | 'car'
}

const saving = ref(false);
const formError = ref<string | null>(null);

// Быстрая форма создания связи
const selectedCardId = ref<string>('');
const selectedEmployeeId = ref<string>('');
const selectedCarId = ref<string>('');

const pendingChanges = ref<PendingChange[]>([]);
const confirm = useConfirm();

const pendingChangesCount = computed<number>(() => pendingChanges.value.length);

// Подгрузка опций для селектов (infinite scroll)
const loadCardOptions = async (params: { page: number; limit: number }): Promise<{ options: SelectOption[]; total: number }> => {
	const res = await cardsApi.getAll({ page: params.page, limit: params.limit });
	return {
		options: res.data.map((c) => ({ value: c._id, label: formatCardNumber(c.card_number) })),
		total: res.total,
	};
};
const loadEmployeeOptions = async (params: { page: number; limit: number }): Promise<{ options: SelectOption[]; total: number }> => {
	const res = await employeesApi.getAll({ page: params.page, limit: params.limit });
	return {
		options: res.data.map((e) => ({ value: e._id, label: e.full_name })),
		total: res.total,
	};
};
const loadCarOptions = async (params: { page: number; limit: number }): Promise<{ options: SelectOption[]; total: number }> => {
	const res = await carsApi.getAll({ page: params.page, limit: params.limit });
	return {
		options: res.data.map((c) => ({
			value: c._id,
			label: `${c.brand} ${c.model} (${c.plate_number})`,
		})),
		total: res.total,
	};
};

const queueAssignLink = (
	linkType: 'employee-card' | 'employee-car' | 'card-car',
	sourceId: string,
	sourceType: 'employee' | 'card' | 'car',
	targetId: string,
	targetType: 'employee' | 'card' | 'car',
) => {
	const samePair = (c: PendingChange) => c.linkType === linkType
		&& ((c.sourceId === sourceId && c.targetId === targetId)
			|| (c.sourceId === targetId && c.targetId === sourceId));

	const existingAssign = pendingChanges.value.find((c) => samePair(c) && c.type === 'assign');
	if (existingAssign) {
		toast.info('Такая связь уже запланирована');
		return false;
	}

	const existingUnassign = pendingChanges.value.find((c) => samePair(c) && c.type === 'unassign');
	if (existingUnassign) {
		pendingChanges.value.splice(pendingChanges.value.indexOf(existingUnassign), 1);
	}

	pendingChanges.value.push({
		type: 'assign',
		linkType,
		sourceId,
		sourceType,
		targetId,
		targetType,
	});

	toast.success('Связь добавлена в очередь изменений');
	return true;
};

const createLinkFromForm = () => {
	formError.value = null;

	const employeeId = selectedEmployeeId.value;
	const cardId = selectedCardId.value;
	const carId = selectedCarId.value;

	const hasEmployee = !!employeeId;
	const hasCard = !!cardId;
	const hasCar = !!carId;

	if (
		(hasEmployee ? 1 : 0)
		+ (hasCard ? 1 : 0)
		+ (hasCar ? 1 : 0)
		< 2
	) {
		formError.value = 'Выберите как минимум две сущности для создания связи';
		toast.warning('Выберите как минимум две сущности для связи');
		return;
	}

	let queued = false;

	// Сотрудник ↔ Карта
	if (hasEmployee && hasCard) {
		const added = queueAssignLink('employee-card', employeeId, 'employee', cardId, 'card');
		if (added) queued = true;
	}

	// Сотрудник ↔ Автомобиль
	if (hasEmployee && hasCar) {
		const added = queueAssignLink('employee-car', employeeId, 'employee', carId, 'car');
		if (added) queued = true;
	}

	// Карта ↔ Автомобиль
	if (hasCard && hasCar) {
		const added = queueAssignLink('card-car', cardId, 'card', carId, 'car');
		if (added) queued = true;
	}

	if (queued) {
		formError.value = null;
		selectedCardId.value = '';
		selectedEmployeeId.value = '';
		selectedCarId.value = '';
	}
};

const resetView = () => {
	if (pendingChanges.value.length > 0) {
		confirm.openConfirm('В очереди есть несохранённые изменения, которые ещё не были сохранены. Сбросить только очередь изменений? Уже сохранённые связи затронуты не будут.', {
			title: 'Сбросить очередь изменений?',
			confirmLabel: 'Сбросить',
			onConfirm: () => {
				pendingChanges.value = [];
			},
		});
	}
};

const saveChanges = async () => {
	if (pendingChanges.value.length === 0) {
		toast.info('Нет изменений для сохранения');
		return;
	}

	saving.value = true;
	try {
		for (const change of pendingChanges.value) {
			await applyChange(change);
		}

		toast.success('Изменения успешно сохранены');
		pendingChanges.value = [];
	} catch (error: unknown) {
		toast.error(getApiErrorMessage(error));
	} finally {
		saving.value = false;
	}
};

const applyChange = async (change: PendingChange) => {
	if (change.type === 'assign') {
		if (change.linkType === 'employee-card') {
			await Promise.all([
				employeesApi.update(change.sourceId, { card_id: change.targetId }),
				cardsApi.update(change.targetId, { assigned_to: change.sourceId }),
			]);
		} else if (change.linkType === 'employee-car') {
			const employee = await employeesApi.getById(change.sourceId);
			const currentCars = employee.assigned_cars || [];
			if (!currentCars.includes(change.targetId)) {
				await Promise.all([
					employeesApi.update(change.sourceId, {
						assigned_cars: [...currentCars, change.targetId],
					}),
					carsApi.update(change.targetId, { assigned_to: change.sourceId }),
				]);
			}
		} else if (change.linkType === 'card-car') {
			await cardsApi.update(change.sourceId, { assigned_car: change.targetId });
		}
	} else if (change.type === 'unassign') {
		if (change.linkType === 'employee-card') {
			await Promise.all([
				employeesApi.update(change.sourceId, { card_id: null } as Record<string, unknown>),
				cardsApi.update(change.targetId, { assigned_to: null } as Record<string, unknown>),
			]);
		} else if (change.linkType === 'employee-car') {
			const employee = await employeesApi.getById(change.sourceId);
			const currentCars = employee.assigned_cars || [];
			const nextCars = currentCars.filter((id: string) => id !== change.targetId);
			await Promise.all([
				employeesApi.update(change.sourceId, { assigned_cars: nextCars }),
				carsApi.update(change.targetId, { assigned_to: null } as Record<string, unknown>),
			]);
		} else if (change.linkType === 'card-car') {
			await cardsApi.update(change.sourceId, { assigned_car: null } as Record<string, unknown>);
		}
	}
};

const removeChange = (change: PendingChange) => {
	const index = pendingChanges.value.indexOf(change);
	if (index !== -1) {
		pendingChanges.value.splice(index, 1);
	}
};

const getEntityLabel = (type: 'employee' | 'card' | 'car') => {
	if (type === 'employee') return 'Сотрудник';
	if (type === 'card') return 'Карта';
	return 'Автомобиль';
};

const getChangeTypeLabel = (change: PendingChange) => (change.type === 'assign' ? 'Создание связи' : 'Удаление связи');

const getLinkTypeLabel = (linkType: PendingChange['linkType']) => {
	if (linkType === 'employee-card') return 'Сотрудник ↔ Карта';
	if (linkType === 'employee-car') return 'Сотрудник ↔ Автомобиль';
	return 'Карта ↔ Автомобиль';
};
</script>

<template>
	<div class="link-builder-page">
		<div class="page-header">
			<div class="page-header__titles">
				<h1>Конструктор связей</h1>
				<p class="page-header__subtitle">
					Управляйте связями между картами, сотрудниками и автомобилями. Сначала
					добавьте изменения в очередь, затем сохраните их одним действием.
				</p>
			</div>
			<div class="header-actions">
				<AppButton variant="secondary" :disabled="saving || !pendingChangesCount" @click="resetView">
					Сбросить очередь
				</AppButton>
				<AppButton
					variant="primary"
					:disabled="saving || !pendingChangesCount"
					@click="saveChanges"
				>
					<span v-if="saving">Сохранение...</span>
					<span v-else-if="pendingChangesCount">
						Сохранить изменения ({{ pendingChangesCount }})
					</span>
					<span v-else>Нет изменений</span>
				</AppButton>
			</div>
		</div>

		<!-- Быстрая форма создания связи -->
		<div class="quick-link-builder card">
			<div class="quick-link-header">
				<h2>Создать связь</h2>
				<p class="quick-link-subtitle">
					Выберите любую комбинацию из карты, сотрудника и автомобиля для создания
					или обновления связей. Все изменения сначала попадут в очередь и будут
					применены после нажатия кнопки «Сохранить изменения».
				</p>
			</div>
			<div class="quick-link-layout">
				<div class="quick-link-node">
					<div class="quick-link-node-header">
						<span class="quick-link-icon">💳</span>
						<span class="quick-link-title">Карта</span>
					</div>
					<FormField
						label="Выберите карту"
						field-id="link-card"
						:error="formError ?? undefined"
					>
						<AppSelect
							v-model="selectedCardId"
							placeholder="Начните вводить номер карты"
							searchable
							:load-options="loadCardOptions"
						/>
					</FormField>
				</div>

				<div class="quick-link-node">
					<div class="quick-link-node-header">
						<span class="quick-link-icon">👤</span>
						<span class="quick-link-title">Сотрудник</span>
					</div>
					<FormField
						label="Выберите сотрудника"
						field-id="link-employee"
						:error="formError ?? undefined"
					>
						<AppSelect
							v-model="selectedEmployeeId"
							placeholder="Начните вводить имя сотрудника"
							searchable
							:load-options="loadEmployeeOptions"
						/>
					</FormField>
				</div>

				<div class="quick-link-node">
					<div class="quick-link-node-header">
						<span class="quick-link-icon">🚗</span>
						<span class="quick-link-title">Автомобиль</span>
					</div>
					<FormField
						label="Выберите автомобиль"
						field-id="link-car"
						:error="formError ?? undefined"
					>
						<AppSelect
							v-model="selectedCarId"
							placeholder="Начните вводить госномер или модель"
							searchable
							:load-options="loadCarOptions"
						/>
					</FormField>
				</div>
			</div>

			<div class="quick-link-actions">
				<AppButton variant="primary" @click="createLinkFromForm">
					Сохранить связь
				</AppButton>
			</div>
		</div>

		<div class="changes-panel card" aria-live="polite">
			<div class="changes-panel__header">
				<h2>Очередь изменений</h2>
				<span class="changes-panel__counter">
					{{ pendingChangesCount }} {{ pendingChangesCount === 1 ? 'изменение' : 'изменений' }}
				</span>
			</div>

			<div v-if="!pendingChangesCount" class="entities-empty">
				В очереди пока нет изменений. Создайте связи с помощью формы выше.
			</div>
			<div v-else class="changes-list">
				<div
					v-for="(change, index) in pendingChanges"
					:key="index"
					class="change-item"
					:class="{ 'change-item--unassign': change.type === 'unassign' }"
				>
					<div class="change-description">
						<div class="change-meta">
							<span class="change-type">
								{{ getChangeTypeLabel(change) }}
							</span>
							<span class="change-link-type">
								{{ getLinkTypeLabel(change.linkType) }}
							</span>
						</div>
						<div class="connection-badge-wrap">
							<span
								class="connection-badge"
								:class="{
									'employee-badge': change.sourceType === 'employee',
									'card-badge': change.sourceType === 'card',
									'car-badge': change.sourceType === 'car',
								}"
							>
								{{ getEntityLabel(change.sourceType) }}
							</span>
							<span>↔</span>
							<span
								class="connection-badge"
								:class="{
									'employee-badge': change.targetType === 'employee',
									'card-badge': change.targetType === 'card',
									'car-badge': change.targetType === 'car',
								}"
							>
								{{ getEntityLabel(change.targetType) }}
							</span>
						</div>
					</div>
					<button
						type="button"
						class="unlink-btn"
						aria-label="Удалить изменение из очереди"
						@click="removeChange(change)"
					>
						×
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.link-builder-page {
	display: flex;
	flex-direction: column;
	gap: $spacing-lg;
}

.page-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: $spacing-md;
	gap: $spacing-lg;
	flex-wrap: wrap;
}

.page-header__titles {
	display: flex;
	flex-direction: column;
	gap: $spacing-xs;
	max-width: 640px;
}

.page-header__subtitle {
	margin: 0;
	color: $text-secondary;
	font-size: $font-size-sm;
}

.link-builder-hint {
	margin-bottom: $spacing-md;
	padding: $spacing-md;

	.hint-text {
		margin: 0 0 $spacing-sm 0;
		color: $text-primary;
		font-size: $font-size-sm;
	}
}

.link-legend {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: $spacing-sm;
	font-size: $font-size-xs;
	color: #666;

	.legend-title {
		font-weight: 600;
		margin-right: $spacing-xs;
	}

	.legend-item {
		padding: $spacing-xs $spacing-sm;
		background: $background;
		border-radius: $border-radius-sm;
	}
}

.table-controls {
	margin-bottom: $spacing-lg;
}

.quick-link-builder {
	margin-bottom: $spacing-md;
	padding: $spacing-lg;

	@media (max-width: 768px) {
		padding: $spacing-md;
	}

	.quick-link-header {
		margin-bottom: $spacing-md;

		h2 {
			margin: 0 0 $spacing-xs 0;
			font-size: $font-size-lg;
			color: $text-primary;
		}

		.quick-link-subtitle {
			margin: 0;
			font-size: $font-size-sm;
			color: $text-secondary;
		}
	}

	.quick-link-layout {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		align-items: stretch;
		gap: $spacing-md;

		@media (max-width: 1024px) {
			grid-template-columns: 1fr;
		}
	}

	.quick-link-node {
		padding: $spacing-md;
		background: $bg-subtle;
		border-radius: $radius;
		box-shadow: $shadow-sm;
		border: 1px solid $border-light;
		display: flex;
		flex-direction: column;
		gap: $spacing-sm;
	}

	.quick-link-node-header {
		display: flex;
		align-items: center;
		gap: $spacing-xs;
	}

	.quick-link-icon {
		font-size: $font-size-xl;
	}

	.quick-link-title {
		font-weight: 600;
		color: $text-primary;
	}

	.quick-link-select {
		width: 100%;
		padding: $spacing-sm $spacing-md;
		border-radius: $border-radius-sm;
		border: 1px solid #d0d7e2;
		font-size: $font-size-sm;
		background-color: white;
		outline: none;
		transition: border-color $transition-fast, box-shadow $transition-fast;

		&:focus {
			border-color: $primary-color;
			box-shadow: 0 0 0 1px rgba($primary-color, 0.2);
		}
	}

	.quick-link-actions {
		display: flex;
		align-items: center;
		margin-top: $spacing-md;

		@media (max-width: 1024px) {
			justify-content: flex-start;
		}

		@media (min-width: 1025px) {
			justify-content: flex-end;
		}
	}
}

.builder-container {
	display: grid;
	grid-template-columns: 300px 1fr;
	gap: $spacing-lg;
	margin-bottom: $spacing-lg;
}

.entities-panel {
	h3 {
		margin-bottom: $spacing-md;
	}
}

.entities-tabs {
	display: flex;
	gap: $spacing-xs;
	margin-bottom: $spacing-md;
	border-bottom: 1px solid #e0e0e0;
}

.tab-btn {
	padding: $spacing-sm $spacing-md;
	background: none;
	border: none;
	border-bottom: 2px solid transparent;
	cursor: pointer;
	font-size: $font-size-sm;
	color: #666;
	transition: all $transition-fast;

	&:hover {
		color: $primary-color;
	}

	&.active {
		color: $primary-color;
		border-bottom-color: $primary-color;
	}
}

.entities-list {
	max-height: 600px;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: $spacing-sm;
}

.entities-empty {
	padding: $spacing-lg;
	text-align: center;
	color: #666;
	font-size: $font-size-sm;
}

.entity-item {
	display: flex;
	align-items: center;
	gap: $spacing-sm;
	padding: $spacing-sm;
	background: $background;
	border-radius: $border-radius;
	cursor: grab;
	transition: all $transition-fast;

	&:hover {
		background: rgba($primary-color, 0.1);
		transform: translateX(4px);
	}

	&:active {
		cursor: grabbing;
		opacity: 0.7;
	}
}

.entity-icon {
	font-size: $font-size-xl;
}

.entity-info {
	flex: 1;
	min-width: 0;
}

.entity-name {
	font-weight: 500;
	color: $text-primary;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.entity-details {
	font-size: $font-size-xs;
	color: #666;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.workspace {
	min-height: 600px;

	h3 {
		margin-bottom: $spacing-md;
	}
}

.workspace-content {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: $spacing-lg;
	min-height: 500px;
}

.entity-column {
	h4 {
		margin-bottom: $spacing-md;
		font-size: $font-size-base;
		color: $text-primary;
	}
}

.entity-nodes {
	display: flex;
	flex-direction: column;
	gap: $spacing-md;
}

.entity-node {
	position: relative;
	padding: $spacing-md;
	background: white;
	border: 2px solid #e0e0e0;
	border-radius: $border-radius;
	transition: all $transition-fast;
	min-height: 100px;

	&.dragging {
		opacity: 0.5;
	}

	&.has-connections {
		border-color: $primary-color;
	}

	&.drop-target {
		border-color: $primary-color;
		background: rgba($primary-color, 0.06);
		box-shadow: 0 0 0 2px rgba($primary-color, 0.3);
	}

	&:hover {
		border-color: $primary-color;
		box-shadow: $shadow-md;
	}
}

.node-content {
	display: flex;
	flex-direction: column;
	gap: $spacing-xs;
}

.node-icon {
	font-size: $font-size-2xl;
	text-align: center;
}

.node-name {
	font-weight: 600;
	color: $text-primary;
	text-align: center;
}

.node-details {
	font-size: $font-size-sm;
	color: #666;
	text-align: center;
}

.node-connections {
	display: flex;
	flex-direction: column;
	gap: $spacing-xs;
	margin-top: $spacing-sm;
}

.connection-badge {
	padding: $spacing-xs $spacing-sm;
	border-radius: $border-radius-sm;
	font-size: $font-size-xs;
	text-align: center;
	max-width: 140px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;

	&.employee-badge {
		background: rgba(#01aecb, 0.1);
		color: #01aecb;
	}

	&.card-badge {
		background: rgba(#27ae60, 0.1);
		color: #27ae60;
	}

	&.car-badge {
		background: rgba(#f39c12, 0.1);
		color: #f39c12;
	}
}

.changes-panel {
	margin-top: $spacing-lg;

	&__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: $spacing-md;
		margin-bottom: $spacing-md;

		h2 {
			margin: 0;
			font-size: $font-size-lg;
			font-weight: $font-weight-semibold;
			color: $text-primary;
		}
	}

	&__counter {
		background: $primary-color;
		color: #fff;
		padding: $spacing-xs $spacing-sm;
		border-radius: $radius-sm;
		font-size: $font-size-sm;
		font-weight: $font-weight-semibold;
	}
}

.changes-list {
	display: flex;
	flex-direction: column;
	gap: $spacing-sm;
}

.change-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: $spacing-sm $spacing-md;
	background: $background;
	border-radius: $border-radius;

	&--unassign {
		background: rgba(#f39c12, 0.08);
		border-left: 3px solid #f39c12;
	}
}

.change-description {
	flex: 1;
	color: $text-primary;
	min-width: 0;
}

.connection-badge-wrap {
	display: inline-flex;
	align-items: center;
	gap: $spacing-xs;
	max-width: 100%;
}

.unlink-btn {
	flex-shrink: 0;
	width: 20px;
	height: 20px;
	padding: 0;
	border: none;
	border-radius: 50%;
	background: rgba(0, 0, 0, 0.1);
	color: #666;
	font-size: 14px;
	line-height: 1;
	cursor: pointer;
	transition: background $transition-fast, color $transition-fast;

	&:hover {
		background: rgba(231, 76, 60, 0.2);
		color: #e74c3c;
	}
}
</style>
