<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import AppButton from '@/components/common/AppButton.vue';
import SearchInput from '@/components/common/SearchInput.vue';
import Confirm from '@/components/common/Confirm.vue';
import { useConfirm } from '@/composables/useConfirm';
import { employeesApi } from '@/api/employees';
import { cardsApi } from '@/api/cards';
import { carsApi } from '@/api/cars';
import { toast } from '@/utils/toast';
import { filterData } from '@/utils/filter';
import type { Employee, Card, Car } from '@/types';

interface DraggedEntity {
	id: string
	type: 'employee' | 'card' | 'car'
	entity: any
}

interface PendingChange {
	type: 'assign' | 'unassign'
	linkType: 'employee-card' | 'employee-car' | 'card-car'
	sourceId: string
	sourceType: 'employee' | 'card' | 'car'
	targetId: string
	targetType: 'employee' | 'card' | 'car'
}

const loading = ref(false);
const saving = ref(false);
const employees = ref<Employee[]>([]);
const cards = ref<Card[]>([]);
const cars = ref<Car[]>([]);
const activeTab = ref<'employee' | 'card' | 'car'>('employee');
const searchQuery = ref('');

// Быстрая форма создания связи
const selectedCardId = ref<string>('');
const selectedEmployeeId = ref<string>('');
const selectedCarId = ref<string>('');

const draggedEntity = ref<DraggedEntity | null>(null);
const dragOverTarget = ref<{ id: string; type: 'employee' | 'card' | 'car' } | null>(null);
const pendingChanges = ref<PendingChange[]>([]);
const confirm = useConfirm();

const entityTabs = [
	{ type: 'employee' as const, label: 'Сотрудники' },
	{ type: 'card' as const, label: 'Карты' },
	{ type: 'car' as const, label: 'Автомобили' },
];

const searchPlaceholder = computed(() => {
	const placeholders: Record<string, string> = {
		employee: 'Поиск по ФИО, должности, отделу...',
		card: 'Поиск по номеру карты...',
		car: 'Поиск по марке, модели, номеру...',
	};
	return placeholders[activeTab.value] || 'Поиск...';
});

const filteredEmployees = computed(() => filterData(employees.value, searchQuery.value, ['full_name', 'position', 'department', 'phone']));
const filteredCards = computed(() => filterData(cards.value, searchQuery.value, ['card_number']));
const filteredCars = computed(() => filterData(cars.value, searchQuery.value, ['brand', 'model', 'plate_number', 'vin']));

// Источники данных для быстрой формы (пока без сложных ограничений)
const availableEmployeesForForm = computed(() => employees.value);
const availableCardsForForm = computed(() => cards.value);
const availableCarsForForm = computed(() => cars.value);

const filteredEntitiesForTab = computed(() => {
	switch (activeTab.value) {
	case 'employee':
		return filteredEmployees.value;
	case 'card':
		return filteredCards.value;
	case 'car':
		return filteredCars.value;
	default:
		return [];
	}
});

const getEntityIcon = (type: string) => {
	const icons: Record<string, string> = {
		employee: '👤',
		card: '💳',
		car: '🚗',
	};
	return icons[type] || '📦';
};

const getEntityName = (entity: any, type: string) => {
	switch (type) {
	case 'employee':
		return entity.full_name;
	case 'card':
		return entity.card_number;
	case 'car':
		return `${entity.brand} ${entity.model}`;
	default:
		return '';
	}
};

const getEntityDetails = (entity: any, type: string) => {
	switch (type) {
	case 'employee':
		return entity.position;
	case 'card':
		return `Баланс: ${entity.balance.toLocaleString('ru-RU')} ₽`;
	case 'car':
		return entity.plate_number;
	default:
		return '';
	}
};

const handleDragStart = (event: DragEvent, entity: any, type: 'employee' | 'card' | 'car') => {
	draggedEntity.value = {
		id: entity._id,
		type,
		entity,
	};
	if (event.dataTransfer) {
		event.dataTransfer.effectAllowed = 'move';
	}
};

const handleDragEnd = () => {
	draggedEntity.value = null;
	dragOverTarget.value = null;
};

const canLink = (sourceType: string, targetType: string) => {
	const pair = [sourceType, targetType].sort().join('-');
	return pair === 'card-employee' || pair === 'car-employee' || pair === 'card-car';
};

const handleNodeDragover = (_event: DragEvent, nodeId: string, nodeType: 'employee' | 'card' | 'car') => {
	if (!draggedEntity.value) return;
	if (draggedEntity.value.id === nodeId && draggedEntity.value.type === nodeType) return;
	if (!canLink(draggedEntity.value.type, nodeType)) return;
	dragOverTarget.value = { id: nodeId, type: nodeType };
};

const handleNodeDragleave = () => {
	dragOverTarget.value = null;
};

const isDropTarget = (id: string, type: string) => {
	const t = dragOverTarget.value;
	return t?.id === id && t?.type === type;
};

const handleDrop = (event: DragEvent) => {
	event.preventDefault();
	draggedEntity.value = null;
	dragOverTarget.value = null;
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

const handleNodeDrop = async (event: DragEvent, targetEntity: any, targetType: 'employee' | 'card' | 'car') => {
	event.preventDefault();
	dragOverTarget.value = null;
	if (!draggedEntity.value) return;

	const sourceType = draggedEntity.value.type;
	const sourceId = draggedEntity.value.id;
	const targetId = targetEntity._id;

	// Определяем тип связи и правильное направление
	let linkType: 'employee-card' | 'employee-car' | 'card-car' | null = null;
	let finalSourceId = sourceId;
	let finalSourceType = sourceType;
	let finalTargetId = targetId;
	let finalTargetType = targetType;

	// Сотрудник -> Карта или Карта -> Сотрудник
	if ((sourceType === 'employee' && targetType === 'card')
			|| (sourceType === 'card' && targetType === 'employee')) {
		linkType = 'employee-card';
		// Всегда сотрудник - источник, карта - цель
		if (sourceType === 'card') {
			finalSourceId = targetId;
			finalSourceType = 'employee';
			finalTargetId = sourceId;
			finalTargetType = 'card';
		}
	} else if ((sourceType === 'employee' && targetType === 'car')
		|| (sourceType === 'car' && targetType === 'employee')) {
		linkType = 'employee-car';
		// Всегда сотрудник - источник, автомобиль - цель
		if (sourceType === 'car') {
			finalSourceId = targetId;
			finalSourceType = 'employee';
			finalTargetId = sourceId;
			finalTargetType = 'car';
		}
	} else if ((sourceType === 'card' && targetType === 'car')
		|| (sourceType === 'car' && targetType === 'card')) {
		linkType = 'card-car';
		// Всегда карта - источник, автомобиль - цель
		if (sourceType === 'car') {
			finalSourceId = targetId;
			finalSourceType = 'card';
			finalTargetId = sourceId;
			finalTargetType = 'car';
		}
	}

	if (!linkType) {
		toast.warning('Невозможно создать связь между этими типами сущностей');
		return;
	}

	queueAssignLink(
		linkType,
		finalSourceId,
		finalSourceType as 'employee' | 'card' | 'car',
		finalTargetId,
		finalTargetType as 'employee' | 'card' | 'car',
	);
	draggedEntity.value = null;
	dragOverTarget.value = null;
};

const createLinkFromForm = () => {
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
		selectedCardId.value = '';
		selectedEmployeeId.value = '';
		selectedCarId.value = '';
	}
};

const hasConnections = (id: string, type: string) => {
	if (type === 'employee') {
		const employee = employees.value.find((e) => e._id === id);
		return !!(employee?.card_id || (employee?.assigned_cars && employee.assigned_cars.length > 0));
	} if (type === 'card') {
		const card = cards.value.find((c) => c._id === id);
		return !!(card?.assigned_to || card?.assigned_car);
	} if (type === 'car') {
		const car = cars.value.find((c) => c._id === id);
		return !!car?.assigned_to;
	}
	return false;
};

const getEmployeeCard = (employeeId: string) => {
	const employee = employees.value.find((e) => e._id === employeeId);
	if (!employee?.card_id) return null;
	return cards.value.find((c) => c._id === employee.card_id);
};

const getEmployeeCars = (employeeId: string) => {
	const employee = employees.value.find((e) => e._id === employeeId);
	if (!employee?.assigned_cars) return [];
	return cars.value.filter((c) => employee.assigned_cars.includes(c._id));
};

const getCardEmployee = (cardId: string) => {
	const card = cards.value.find((c) => c._id === cardId);
	if (!card?.assigned_to) return null;
	return employees.value.find((e) => e._id === card.assigned_to);
};

const getCardCar = (cardId: string) => {
	const card = cards.value.find((c) => c._id === cardId);
	if (!card?.assigned_car) return null;
	return cars.value.find((c) => c._id === card.assigned_car);
};

const getCarEmployee = (carId: string) => {
	const car = cars.value.find((c) => c._id === carId);
	if (!car?.assigned_to) return null;
	return employees.value.find((e) => e._id === car.assigned_to);
};

const getCardNumber = (card: Card | null) => card?.card_number || '';

const getCarInfo = (car: Car | null) => (car ? `${car.brand} ${car.model}` : '');

const truncateBadge = (text: string, maxLen: number) => {
	if (!text) return '';
	return text.length <= maxLen ? text : `${text.slice(0, maxLen - 1)}…`;
};

const getChangeDescription = (change: PendingChange) => {
	const sourceName = getEntityNameById(change.sourceId, change.sourceType);
	const targetName = getEntityNameById(change.targetId, change.targetType);

	const linkLabels: Record<string, string> = {
		'employee-card': 'Сотрудник ↔ Карта',
		'employee-car': 'Сотрудник ↔ Автомобиль',
		'card-car': 'Карта ↔ Автомобиль',
	};
	const linkPart = `${linkLabels[change.linkType]}: ${sourceName} → ${targetName}`;
	return change.type === 'unassign' ? `Отвязать: ${linkPart}` : linkPart;
};

const getEntityNameById = (id: string, type: string) => {
	switch (type) {
	case 'employee':
		return employees.value.find((e) => e._id === id)?.full_name || id;
	case 'card':
		return cards.value.find((c) => c._id === id)?.card_number || id;
	case 'car': {
		const car = cars.value.find((c) => c._id === id);
		return car ? `${car.brand} ${car.model}` : id;
	}
	default:
		return id;
	}
};

const removeChange = (index: number) => {
	pendingChanges.value.splice(index, 1);
};

const queueUnassign = (
	linkType: 'employee-card' | 'employee-car' | 'card-car',
	sourceId: string,
	sourceType: 'employee' | 'card' | 'car',
	targetId: string,
	targetType: 'employee' | 'card' | 'car',
) => {
	const existing = pendingChanges.value.find(
		(c) => c.linkType === linkType
			&& ((c.sourceId === sourceId && c.targetId === targetId) || (c.sourceId === targetId && c.targetId === sourceId)),
	);
	if (existing) {
		if (existing.type === 'unassign') {
			toast.info('Отвязка уже в очереди');
			return;
		}
		removeChange(pendingChanges.value.indexOf(existing));
	}
	pendingChanges.value.push({
		type: 'unassign',
		linkType,
		sourceId,
		sourceType,
		targetId,
		targetType,
	});
	toast.success('Отвязка добавлена в очередь изменений');
};

const resetView = () => {
	if (pendingChanges.value.length > 0) {
		confirm.openConfirm('В очереди есть несохранённые изменения. Сбросить очередь и обновить данные?', {
			title: 'Сбросить изменения?',
			confirmLabel: 'Сбросить',
			onConfirm: () => {
				pendingChanges.value = [];
				loadData();
			},
		});
	} else {
		loadData();
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
		await loadData();
	} catch (error: any) {
		toast.error(error?.response?.data?.message || 'Ошибка сохранения изменений');
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
			const employee = employees.value.find((e) => e._id === change.sourceId);
			if (employee) {
				const currentCars = employee.assigned_cars || [];
				if (!currentCars.includes(change.targetId)) {
					await Promise.all([
						employeesApi.update(change.sourceId, {
							assigned_cars: [...currentCars, change.targetId],
						}),
						carsApi.update(change.targetId, { assigned_to: change.sourceId }),
					]);
				}
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
			const employee = employees.value.find((e) => e._id === change.sourceId);
			if (employee) {
				const currentCars = employee.assigned_cars || [];
				const nextCars = currentCars.filter((id: string) => id !== change.targetId);
				await Promise.all([
					employeesApi.update(change.sourceId, { assigned_cars: nextCars }),
					carsApi.update(change.targetId, { assigned_to: null } as Record<string, unknown>),
				]);
			}
		} else if (change.linkType === 'card-car') {
			await cardsApi.update(change.sourceId, { assigned_car: null } as Record<string, unknown>);
		}
	}
};

const loadData = async () => {
	loading.value = true;
	try {
		const [empRes, cardRes, carRes] = await Promise.all([
			employeesApi.getAll(),
			cardsApi.getAll(),
			carsApi.getAll(),
		]);
		employees.value = empRes.data;
		cards.value = cardRes.data;
		cars.value = carRes.data;
	} catch (error) {
		console.error('Ошибка загрузки данных:', error);
		toast.error('Ошибка загрузки данных');
	} finally {
		loading.value = false;
	}
};

onMounted(() => {
	loadData();
});
</script>

<template>
	<div class="link-builder-page">
		<div class="page-header">
			<h1>Конструктор связей</h1>
			<div class="header-actions">
				<AppButton variant="secondary" @click="resetView">Сбросить</AppButton>
				<AppButton variant="primary" :disabled="saving" @click="saveChanges">
					{{ saving ? 'Сохранение...' : 'Сохранить изменения' }}
				</AppButton>
			</div>
		</div>

		<div v-if="loading" class="loading">Загрузка данных...</div>
		<template v-else>
			<!-- Быстрая форма создания связи -->
			<div class="quick-link-builder card">
				<div class="quick-link-header">
					<h2>Создать связь</h2>
					<p class="quick-link-subtitle">
						Выберите карту, сотрудника и автомобиль для создания связи между ними.
						Изменения будут применены после нажатия кнопки «Сохранить изменения».
					</p>
				</div>
				<div class="quick-link-layout">
					<div class="quick-link-node">
						<div class="quick-link-node-header">
							<span class="quick-link-icon">💳</span>
							<span class="quick-link-title">Карта</span>
						</div>
						<select
							v-model="selectedCardId"
							class="quick-link-select"
						>
							<option value="">Выберите карту</option>
							<option
								v-for="card in availableCardsForForm"
								:key="card._id"
								:value="card._id"
							>
								{{ card.card_number }}
							</option>
						</select>
					</div>

					<div class="quick-link-node">
						<div class="quick-link-node-header">
							<span class="quick-link-icon">👤</span>
							<span class="quick-link-title">Сотрудник</span>
						</div>
						<select
							v-model="selectedEmployeeId"
							class="quick-link-select"
						>
							<option value="">Выберите сотрудника</option>
							<option
								v-for="employee in availableEmployeesForForm"
								:key="employee._id"
								:value="employee._id"
							>
								{{ employee.full_name }}
							</option>
						</select>
					</div>

					<div class="quick-link-node">
						<div class="quick-link-node-header">
							<span class="quick-link-icon">🚗</span>
							<span class="quick-link-title">Автомобиль</span>
						</div>
						<select
							v-model="selectedCarId"
							class="quick-link-select"
						>
							<option value="">Выберите автомобиль</option>
							<option
								v-for="car in availableCarsForForm"
								:key="car._id"
								:value="car._id"
							>
								{{ car.brand }} {{ car.model }} ({{ car.plate_number }})
							</option>
						</select>
					</div>
				</div>

				<div class="quick-link-actions">
					<AppButton variant="primary" @click="createLinkFromForm">
						Сохранить связь
					</AppButton>
				</div>
			</div>

			<div class="link-builder-hint card">
				<p class="hint-text">
					Перетащите сущность из списка слева на узел в рабочей области,
					чтобы создать связь. Изменения применятся после нажатия «Сохранить изменения».
				</p>
				<div class="link-legend">
					<span class="legend-title">Какие связи возможны:</span>
					<span class="legend-item">👤 Сотрудник ↔ 💳 Карта</span>
					<span class="legend-item">👤 Сотрудник ↔ 🚗 Автомобиль</span>
					<span class="legend-item">💳 Карта ↔ 🚗 Автомобиль</span>
				</div>
			</div>
			<div class="table-controls card">
				<SearchInput
					v-model="searchQuery"
					:placeholder="searchPlaceholder"
				/>
			</div>
			<div class="builder-container">
				<!-- Панель сущностей -->
				<div class="entities-panel card">
					<h3>Сущности</h3>
					<div class="entities-tabs">
						<button
							v-for="tab in entityTabs"
							:key="tab.type"
							class="tab-btn"
							:class="{ active: activeTab === tab.type }"
							@click="activeTab = tab.type"
						>
							{{ tab.label }}
						</button>
					</div>

					<div class="entities-list">
						<template v-if="filteredEntitiesForTab.length > 0">
							<div
								v-for="entity in filteredEntitiesForTab"
								:key="entity._id"
								class="entity-item"
								draggable="true"
								@dragstart="handleDragStart($event, entity, activeTab)"
								@dragend="handleDragEnd"
							>
								<div class="entity-icon">{{ getEntityIcon(activeTab) }}</div>
								<div class="entity-info">
									<div class="entity-name">{{ getEntityName(entity, activeTab) }}</div>
									<div class="entity-details">{{ getEntityDetails(entity, activeTab) }}</div>
								</div>
							</div>
						</template>
						<div v-else class="entities-empty">Ничего не найдено</div>
					</div>
				</div>

				<!-- Рабочая область -->
				<div class="workspace card" @drop="handleDrop" @dragover.prevent>
					<h3>Рабочая область</h3>
					<div class="workspace-content">
						<!-- Сотрудники -->
						<div class="entity-column">
							<h4>Сотрудники</h4>
							<div class="entity-nodes">
								<div
									v-for="employee in filteredEmployees"
									:key="employee._id"
									class="entity-node employee-node"
									:class="{
										'dragging': draggedEntity?.id === employee._id && draggedEntity?.type === 'employee',
										'has-connections': hasConnections(employee._id, 'employee'),
										'drop-target': isDropTarget(employee._id, 'employee')
									}"
									@drop="handleNodeDrop($event, employee, 'employee')"
									@dragover.prevent="handleNodeDragover($event, employee._id, 'employee')"
									@dragleave="handleNodeDragleave"
								>
									<div class="node-content">
										<div class="node-icon">👤</div>
										<div class="node-name">{{ employee.full_name }}</div>
										<div class="node-connections">
											<span v-if="getEmployeeCard(employee._id)" class="connection-badge-wrap">
												<span class="connection-badge card-badge">
													💳 {{ truncateBadge(getCardNumber(getEmployeeCard(employee._id)), 12) }}
												</span>
												<button type="button" class="unlink-btn" title="Отвязать" @click.stop="queueUnassign('employee-card', employee._id, 'employee', getEmployeeCard(employee._id)!._id, 'card')">×</button>
											</span>
											<span v-for="car in getEmployeeCars(employee._id)" :key="car._id" class="connection-badge-wrap">
												<span class="connection-badge car-badge">🚗 {{ truncateBadge(getCarInfo(car), 10) }}</span>
												<button type="button" class="unlink-btn" title="Отвязать" @click.stop="queueUnassign('employee-car', employee._id, 'employee', car._id, 'car')">×</button>
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>

						<!-- Карты -->
						<div class="entity-column">
							<h4>Карты</h4>
							<div class="entity-nodes">
								<div
									v-for="card in filteredCards"
									:key="card._id"
									class="entity-node card-node"
									:class="{
										'dragging': draggedEntity?.id === card._id && draggedEntity?.type === 'card',
										'has-connections': hasConnections(card._id, 'card'),
										'drop-target': isDropTarget(card._id, 'card')
									}"
									@drop="handleNodeDrop($event, card, 'card')"
									@dragover.prevent="handleNodeDragover($event, card._id, 'card')"
									@dragleave="handleNodeDragleave"
								>
									<div class="node-content">
										<div class="node-icon">💳</div>
										<div class="node-name">{{ card.card_number }}</div>
										<div class="node-connections">
											<span v-if="getCardEmployee(card._id)" class="connection-badge-wrap">
												<span class="connection-badge employee-badge">
													👤 {{ truncateBadge(getCardEmployee(card._id)?.full_name || '', 14) }}
												</span>
												<button type="button" class="unlink-btn" title="Отвязать" @click.stop="queueUnassign('employee-card', getCardEmployee(card._id)!._id, 'employee', card._id, 'card')">×</button>
											</span>
											<span v-if="getCardCar(card._id)" class="connection-badge-wrap">
												<span class="connection-badge car-badge">
													🚗 {{ truncateBadge(getCarInfo(getCardCar(card._id)), 14) }}
												</span>
												<button type="button" class="unlink-btn" title="Отвязать" @click.stop="queueUnassign('card-car', card._id, 'card', getCardCar(card._id)!._id, 'car')">×</button>
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>

						<!-- Автомобили -->
						<div class="entity-column">
							<h4>Автомобили</h4>
							<div class="entity-nodes">
								<div
									v-for="car in filteredCars"
									:key="car._id"
									class="entity-node car-node"
									:class="{
										'dragging': draggedEntity?.id === car._id && draggedEntity?.type === 'car',
										'has-connections': hasConnections(car._id, 'car'),
										'drop-target': isDropTarget(car._id, 'car')
									}"
									@drop="handleNodeDrop($event, car, 'car')"
									@dragover.prevent="handleNodeDragover($event, car._id, 'car')"
									@dragleave="handleNodeDragleave"
								>
									<div class="node-content">
										<div class="node-icon">🚗</div>
										<div class="node-name">{{ car.brand }} {{ car.model }}</div>
										<div class="node-details">{{ car.plate_number }}</div>
										<div class="node-connections">
											<span v-if="getCarEmployee(car._id)" class="connection-badge-wrap">
												<span class="connection-badge employee-badge">
													👤 {{ truncateBadge(getCarEmployee(car._id)?.full_name || '', 14) }}
												</span>
												<button type="button" class="unlink-btn" title="Отвязать" @click.stop="queueUnassign('employee-car', getCarEmployee(car._id)!._id, 'employee', car._id, 'car')">×</button>
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Панель изменений -->
			<div v-if="pendingChanges.length > 0" class="changes-panel card">
				<h3>Ожидающие изменения</h3>
				<div class="changes-list">
					<div v-for="(change, index) in pendingChanges" :key="index" class="change-item" :class="{ 'change-item--unassign': change.type === 'unassign' }">
						<span class="change-description">{{ getChangeDescription(change) }}</span>
						<AppButton size="sm" variant="danger" @click="removeChange(index)">Отменить</AppButton>
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
.link-builder-page {
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
			color: #666;
		}
	}

	.quick-link-layout {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
		align-items: stretch;
		gap: $spacing-md;

		@media (max-width: 1024px) {
			grid-template-columns: 1fr;
		}
	}

	.quick-link-node {
		padding: $spacing-md;
		background: #f9fbfc;
		border-radius: $border-radius;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
		border: 1px solid #e0e6ee;
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
		margin-top: 12px;

		@media (max-width: 1024px) {
			justify-content: flex-start;
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

	h3 {
		margin-bottom: $spacing-md;
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
