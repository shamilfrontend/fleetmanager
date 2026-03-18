<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppButton from '@/components/common/AppButton.vue';
import DataTable from '@/components/common/DataTable.vue';
import DoughnutChart from '@/components/dashboard/DoughnutChart.vue';
import LineChart from '@/components/dashboard/LineChart.vue';
import BarChart from '@/components/dashboard/BarChart.vue';
import { formatCurrency, formatDate, formatCardNumber } from '@/utils/helpers';
import { transactionsApi } from '@/api/transactions';
import { carsApi } from '@/api/cars';
import { employeesApi } from '@/api/employees';
import { cardsApi } from '@/api/cards';
import { maintenanceApi, type UpcomingMaintenance } from '@/api/maintenance';
import { useCarsStore } from '@/stores/cars';
import { useEmployeesStore } from '@/stores/employees';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { getApiErrorMessage } from '@/utils/apiError';
import type {
	Transaction, Car, Employee, Card, PaginatedResponse,
} from '@/types';
import { chartColors } from '@/theme/colors';

interface Column {
	key: string
	label: string
	format?: 'date' | 'currency' | 'number'
	sortable?: boolean
}

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const carsStore = useCarsStore();
const employeesStore = useEmployeesStore();

const stats = ref({
	cars: 0,
	activeCars: 0,
	employees: 0,
	activeEmployees: 0,
	balance: 0,
	cards: 0,
	avgBalance: 0,
	transactions: 0,
	monthlyExpenses: 0,
});

const recentTransactions = ref<Transaction[]>([]);
const allTransactions = ref<Transaction[]>([]);
const allCars = ref<Car[]>([]);
const allEmployees = ref<Employee[]>([]);
const allCards = ref<Card[]>([]);
const upcomingMaintenance = ref<UpcomingMaintenance[]>([]);
const loading = ref(true);

const transactionColumns: Column[] = [
	{ key: 'date', label: 'Дата', format: 'date' },
	{ key: 'amount', label: 'Сумма', format: 'currency' },
	{ key: 'location', label: 'Место' },
	{ key: 'status', label: 'Статус' },
];

const carStatusData = computed(() => {
	const statusCounts = allCars.value.reduce((acc, car) => {
		acc[car.status] = (acc[car.status] || 0) + 1;
		return acc;
	}, {} as Record<string, number>);

	const statusLabels: Record<string, string> = {
		active: 'Активен',
		repair: 'В ремонте',
		reserve: 'Резерв',
	};

	return {
		labels: Object.keys(statusCounts).map((s) => statusLabels[s] || s),
		datasets: [{
			label: 'Количество',
			data: Object.values(statusCounts),
			backgroundColor: [chartColors.success, chartColors.warning, chartColors.palette[2]],
			borderColor: [chartColors.success, chartColors.warning, chartColors.palette[2]],
		}],
	};
});

const monthlyExpensesData = computed(() => {
	const last6Months = Array.from({ length: 6 }, (_, i) => {
		const date = new Date();
		date.setMonth(date.getMonth() - (5 - i));
		return date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
	});

	const monthlyData = last6Months.map((month) => {
		const monthDate = new Date(month);
		return allTransactions.value
			.filter((t) => {
				const tDate = new Date(t.date);
				return tDate.getMonth() === monthDate.getMonth()
					&& tDate.getFullYear() === monthDate.getFullYear()
					&& t.status === 'completed';
			})
			.reduce((sum, t) => sum + t.amount, 0);
	});

	return {
		labels: last6Months,
		datasets: [{
			label: 'Расход (руб.)',
			data: monthlyData,
			borderColor: chartColors.primary,
			backgroundColor: chartColors.primaryLight,
		}],
	};
});

const topDriversData = computed(() => {
	const driverExpenses = allTransactions.value.reduce((acc, t) => {
		const empId = typeof t.employee_id === 'string' ? t.employee_id : (t.employee_id as { _id?: string })?._id ?? '';
		const emp = allEmployees.value.find((e) => e._id === empId);
		if (emp && t.status === 'completed') {
			acc[emp.full_name] = (acc[emp.full_name] || 0) + t.amount;
		}
		return acc;
	}, {} as Record<string, number>);

	const sorted = Object.entries(driverExpenses)
		.sort(([, a], [, b]) => (b as number) - (a as number))
		.slice(0, 5);

	return {
		labels: sorted.map(([name]) => name),
		datasets: [{
			label: 'Расход (руб.)',
			data: sorted.map(([, amount]) => amount),
			backgroundColor: chartColors.primary,
		}],
	};
});

const isUrgent = (item: UpcomingMaintenance): boolean => {
	if (item.type === 'date' && item.nextServiceDate) {
		const serviceDate = new Date(item.nextServiceDate);
		const today = new Date();
		const daysUntil = Math.ceil((serviceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
		return daysUntil <= 7;
	} if (item.type === 'mileage' && item.remainingMileage !== undefined) {
		return item.remainingMileage <= 200;
	}
	return false;
};

const goToCarMaintenance = (carId: string) => {
	router.push({ name: 'Cars', query: { maintenance: carId } });
};

const goToCard = (cardId: string) => {
	router.push({ name: 'CardDetail', params: { id: cardId } });
};

const carsInRepairCount = computed(() => allCars.value.filter((c: Car) => c.status === 'repair').length);
const carsInRepairLabel = computed(() => {
	const n = carsInRepairCount.value;
	if (n === 1) return 'автомобиль';
	if (n >= 2 && n <= 4) return 'автомобиля';
	return 'автомобилей';
});
const goToCarsInRepair = () => {
	router.push({ name: 'Cars', query: { status: 'repair' } });
};

const lowBalanceCards = computed(() => {
	const list = Array.isArray(allCards.value) ? allCards.value : [];
	return list
		.filter((card) => card.status === 'active' && card.balance < 5000)
		.sort((a, b) => a.balance - b.balance)
		.slice(0, 10);
});

const EXPIRING_DAYS = 60;
const EXPIRING_URGENT_DAYS = 14;

const expiringCards = computed(() => {
	const now = new Date();
	const limit = new Date(now);
	limit.setDate(limit.getDate() + EXPIRING_DAYS);
	const list = Array.isArray(allCards.value) ? allCards.value : [];
	return list
		.filter((card) => card.expiry_date && card.status === 'active')
		.filter((card) => {
			const exp = new Date(card.expiry_date);
			return exp >= now && exp <= limit;
		})
		.sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
		.slice(0, 10);
});

const isCardExpiringSoon = (card: { expiry_date?: string }) => {
	if (!card.expiry_date) return false;
	const exp = new Date(card.expiry_date);
	const now = new Date();
	const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
	return daysLeft <= EXPIRING_URGENT_DAYS;
};

const loadDashboardData = async () => {
	loading.value = true;
	try {
		// Загружаем все данные параллельно (API возвращает PaginatedResponse с полем data)
		const results = await Promise.all([
			transactionsApi.getAll(),
			carsApi.getAll(),
			employeesApi.getAll(),
			cardsApi.getAll(),
			maintenanceApi.getUpcoming(30).catch(() => ({ upcoming: [], upcomingByMileage: [] })),
		]) as [PaginatedResponse<Transaction>, PaginatedResponse<Car>, PaginatedResponse<Employee>, PaginatedResponse<{ balance?: number }>, { upcoming: UpcomingMaintenance[]; upcomingByMileage: UpcomingMaintenance[] }];
		const transactionsList = results[0].data ?? [];
		const carsList = results[1].data ?? [];
		const employeesList = results[2].data ?? [];
		const cardsList = results[3].data ?? [];
		const upcomingData = results[4];
		allTransactions.value = transactionsList;
		allCars.value = carsList;
		allEmployees.value = employeesList;
		allCards.value = cardsList;

		// Объединяем предстоящие ТО
		upcomingMaintenance.value = [
			...upcomingData.upcoming,
			...upcomingData.upcomingByMileage,
		].sort((a: UpcomingMaintenance, b: UpcomingMaintenance) => {
			if (a.type === 'date' && b.type === 'date' && a.nextServiceDate && b.nextServiceDate) {
				return new Date(a.nextServiceDate).getTime() - new Date(b.nextServiceDate).getTime();
			}
			return 0;
		});

		// Обновляем статистику
		stats.value.transactions = transactionsList.length;
		stats.value.cars = carsList.length;
		stats.value.activeCars = carsList.filter((c: Car) => c.status === 'active').length;
		stats.value.employees = employeesList.length;
		stats.value.activeEmployees = employeesList.filter((e: Employee) => e.status === 'active').length;
		stats.value.cards = cardsList.length;
		stats.value.balance = cardsList.reduce((sum: number, card: Card) => sum + (card.balance ?? 0), 0);
		stats.value.avgBalance = cardsList.length > 0
			? cardsList.reduce((sum: number, card: Card) => sum + (card.balance ?? 0), 0) / cardsList.length
			: 0;

		// Расходы за текущий месяц
		const currentMonth = new Date().getMonth();
		const currentYear = new Date().getFullYear();
		stats.value.monthlyExpenses = transactionsList
			.filter((t: Transaction) => {
				const tDate = new Date(t.date);
				return tDate.getMonth() === currentMonth
					&& tDate.getFullYear() === currentYear
					&& t.status === 'completed';
			})
			.reduce((sum: number, t: Transaction) => sum + t.amount, 0);

		// Последние транзакции
		recentTransactions.value = transactionsList
			.sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime())
			.slice(0, 10);

		// Обновляем stores
		carsStore.cars = carsList;
		employeesStore.employees = employeesList;
	} catch (error) {
		toast.error(getApiErrorMessage(error) || 'Не удалось загрузить данные дашборда');
	} finally {
		loading.value = false;
	}
};

onMounted(() => {
	loadDashboardData();
});
</script>

<template>
	<div class="dashboard">
		<div v-if="loading" class="loading" role="status" aria-live="polite" aria-label="Загрузка данных">Загрузка данных...</div>
		<template v-else>
			<section class="dashboard-hero card">
				<div class="dashboard-hero__left">
					<p class="dashboard-hero__subtitle">Ежемесячный обзор парка</p>
					<h2 class="dashboard-hero__title">
						Поздравляем, {{ authStore.user?.email || 'коллега' }}!
					</h2>
					<p class="dashboard-hero__text">
						В этом месяце расходы по топливным картам и состоянию парка под контролем.
					</p>
					<AppButton variant="primary" @click="router.push({ name: 'Analytics' })">
						Открыть аналитику
					</AppButton>
				</div>
				<div class="dashboard-hero__right">
					<div class="hero-metric">
						<span class="hero-metric__label">Расходы за месяц</span>
						<span class="hero-metric__value">
							{{ formatCurrency(stats.monthlyExpenses) }}
						</span>
					</div>
					<div class="hero-metric hero-metric--secondary">
						<span class="hero-metric__label">Баланс по всем картам</span>
						<span class="hero-metric__value">
							{{ formatCurrency(stats.balance) }}
						</span>
					</div>
				</div>
			</section>

			<!-- Уведомления о предстоящем ТО -->
			<div v-if="upcomingMaintenance.length > 0" class="maintenance-alerts card">
				<div class="alerts-header">
					<h3>⚠️ Предстоящее ТО</h3>
					<span class="alerts-count">{{ upcomingMaintenance.length }}</span>
				</div>
				<div class="alerts-list">
					<div
						v-for="(item, index) in upcomingMaintenance"
						:key="index"
						class="alert-item"
						:class="{ 'urgent': isUrgent(item) }"
					>
						<div class="alert-icon">{{ isUrgent(item) ? '🔴' : '🟡' }}</div>
						<div class="alert-content">
							<div class="alert-car">
								{{ item.car.brand }} {{ item.car.model }} ({{ item.car.plate_number }})
							</div>
							<div class="alert-details">
								<span v-if="item.type === 'date' && item.nextServiceDate">
									ТО запланировано на {{ formatDate(item.nextServiceDate) }}
								</span>
								<span v-else-if="item.type === 'mileage' && item.remainingMileage !== undefined">
									ТО по пробегу через {{ item.remainingMileage }} км
								</span>
							</div>
						</div>
						<AppButton size="sm" variant="secondary" @click="goToCarMaintenance(item.car._id)">
							Открыть
						</AppButton>
					</div>
				</div>
			</div>

			<!-- Низкий баланс карт и Карты с истекающим сроком (по 50% ширины) -->
			<div
				v-if="lowBalanceCards.length > 0 || expiringCards.length > 0"
				class="cards-alerts-row"
			>
				<div v-if="lowBalanceCards.length > 0" class="balance-alerts card">
					<div class="alerts-header">
						<h3>💳 Низкий баланс карт</h3>
						<span class="alerts-count">{{ lowBalanceCards.length }}</span>
					</div>
					<div class="alerts-list">
						<div
							v-for="card in lowBalanceCards"
							:key="card._id"
							class="alert-item"
							:class="{ 'urgent': card.balance < 1000 }"
						>
							<div class="alert-icon">{{ card.balance < 1000 ? '🔴' : '🟡' }}</div>
							<div class="alert-content">
								<div class="alert-card">
									Карта {{ formatCardNumber(card.card_number) }}
								</div>
								<div class="alert-details">
									Баланс: {{ formatCurrency(card.balance) }}
									<span v-if="card.limit"> / Лимит: {{ formatCurrency(card.limit) }}</span>
								</div>
							</div>
							<AppButton size="sm" variant="secondary" @click="goToCard(card._id)">
								Открыть
							</AppButton>
						</div>
					</div>
				</div>

				<div v-if="expiringCards.length > 0" class="expiring-cards-alerts card">
					<div class="alerts-header">
						<h3>📅 Карты с истекающим сроком</h3>
						<span class="alerts-count">{{ expiringCards.length }}</span>
					</div>
					<div class="alerts-list">
						<div
							v-for="card in expiringCards"
							:key="card._id"
							class="alert-item"
							:class="{ 'urgent': isCardExpiringSoon(card) }"
						>
							<div class="alert-icon">{{ isCardExpiringSoon(card) ? '🔴' : '🟡' }}</div>
							<div class="alert-content">
								<div class="alert-card">Карта {{ formatCardNumber(card.card_number) }}</div>
								<div class="alert-details">
									Срок действия до {{ formatDate(card.expiry_date) }}
								</div>
							</div>
							<AppButton size="sm" variant="secondary" @click="goToCard(card._id)">Открыть</AppButton>
						</div>
					</div>
				</div>
			</div>

			<!-- Машины в ремонте -->
			<div v-if="carsInRepairCount > 0" class="repair-widget card">
				<div class="repair-widget__content">
					<span class="repair-widget__icon">🔧</span>
					<div class="repair-widget__text">
						<strong>В ремонте:</strong> {{ carsInRepairCount }} {{ carsInRepairLabel }}
					</div>
					<AppButton size="sm" variant="secondary" @click="goToCarsInRepair">Открыть гараж</AppButton>
				</div>
			</div>

			<!-- Нет срочных уведомлений -->
			<div v-if="upcomingMaintenance.length === 0 && lowBalanceCards.length === 0 && expiringCards.length === 0" class="alerts-ok card">
				<span class="alerts-ok__icon">✓</span>
				<div class="alerts-ok__body">
					<p class="alerts-ok__text">Всё в порядке</p>
					<p class="alerts-ok__hint">Нет срочных уведомлений по ТО, балансу и сроку карт</p>
				</div>
			</div>

			<!-- Быстрые действия -->
			<div class="quick-actions card">
				<h2>Быстрые действия</h2>
				<div class="actions-grid">
					<AppButton variant="secondary" block class="action-btn" @click="router.push({ name: 'Cars' })">
						<template #left><span class="action-icon">🚗</span></template>
						Добавить автомобиль
					</AppButton>
					<AppButton
						v-if="authStore.isManager || authStore.isAdmin"
						variant="secondary"
						block
						class="action-btn"
						@click="router.push({ name: 'Employees' })"
					>
						<template #left><span class="action-icon">👤</span></template>
						Добавить сотрудника
					</AppButton>
					<AppButton
						v-if="authStore.isManager || authStore.isAdmin"
						variant="secondary"
						block
						class="action-btn"
						@click="router.push({ name: 'Cards' })"
					>
						<template #left><span class="action-icon">💳</span></template>
						Добавить карту
					</AppButton>
					<AppButton
						v-if="authStore.isManager || authStore.isAdmin"
						variant="secondary"
						block
						class="action-btn"
						@click="router.push({ name: 'Transactions' })"
					>
						<template #left><span class="action-icon">📝</span></template>
						Новая транзакция
					</AppButton>
					<AppButton
						v-if="authStore.isManager || authStore.isAdmin"
						variant="secondary"
						block
						class="action-btn"
						@click="router.push({ name: 'LinkBuilder' })"
					>
						<template #left><span class="action-icon">🔧</span></template>
						Конструктор связей
					</AppButton>
					<AppButton
						v-if="authStore.isManager || authStore.isAdmin"
						variant="secondary"
						block
						class="action-btn"
						@click="router.push({ name: 'Analytics' })"
					>
						<template #left><span class="action-icon">📈</span></template>
						Аналитика
					</AppButton>
				</div>
			</div>

			<div class="stats-grid">
				<div class="stat-card card">
					<div class="stat-icon">🚗</div>
					<div class="stat-info">
						<h3 class="stat-value">{{ stats.cars }}</h3>
						<p class="stat-label">Автомобилей</p>
						<p v-if="stats.cars > 0" class="stat-detail">
							Активных: {{ stats.activeCars }} ({{ Math.round((stats.activeCars / stats.cars) * 100) }}%)
						</p>
					</div>
				</div>
				<div class="stat-card card">
					<div class="stat-icon">👥</div>
					<div class="stat-info">
						<h3 class="stat-value">{{ stats.employees }}</h3>
						<p class="stat-label">Сотрудников</p>
						<p v-if="stats.employees > 0" class="stat-detail">
							Активных: {{ stats.activeEmployees }}
						</p>
					</div>
				</div>
				<div class="stat-card card">
					<div class="stat-icon">💳</div>
					<div class="stat-info">
						<h3 class="stat-value">{{ formatCurrency(stats.balance) }}</h3>
						<p class="stat-label">Баланс карт</p>
						<p v-if="stats.cards > 0" class="stat-detail">
							Карт: {{ stats.cards }} | Средний баланс: {{ formatCurrency(stats.avgBalance) }}
						</p>
					</div>
				</div>
				<div class="stat-card card">
					<div class="stat-icon">📝</div>
					<div class="stat-info">
						<h3 class="stat-value">{{ stats.transactions }}</h3>
						<p class="stat-label">Транзакций</p>
						<p v-if="stats.monthlyExpenses > 0" class="stat-detail">
							За месяц: {{ formatCurrency(stats.monthlyExpenses) }}
						</p>
					</div>
				</div>
			</div>

			<div class="dashboard-content">
				<div class="card">
					<h2>Статус автомобилей</h2>
					<DoughnutChart :data="carStatusData" />
				</div>
				<div class="card">
					<h2>Расходы за последние 6 месяцев</h2>
					<LineChart :data="monthlyExpensesData" />
				</div>
				<div class="card">
					<h2>Топ-5 водителей по расходам</h2>
					<BarChart :data="topDriversData" />
				</div>
				<div class="card card--full-width">
					<h2>Последние транзакции</h2>
					<DataTable
						:data="recentTransactions"
						:columns="transactionColumns"
						:actions="[]"
					/>
				</div>
			</div>
		</template>
	</div>
</template>

<style scoped lang="scss">
@import '@/assets/scss/variables.scss';

$chart-warning-accent: #ed6c02;

.dashboard {
	display: flex;
	flex-direction: column;
	gap: $spacing-lg;
}

.dashboard-hero {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: $spacing-lg;

	&__left {
		max-width: 520px;
		display: flex;
		flex-direction: column;
		gap: $spacing-md;
	}

	&__subtitle {
		font-size: $font-size-sm;
		color: $text-muted;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	&__title {
		font-size: $font-size-2xl;
		font-weight: $font-weight-semibold;
		letter-spacing: $letter-spacing-tight;
	}

	&__text {
		color: $text-secondary;
		font-size: $font-size-sm;
	}

	&__right {
		display: flex;
		flex-direction: column;
		gap: $spacing-md;
		min-width: 220px;
		align-items: flex-end;
	}
}

.hero-metric {
	padding: $spacing-md $spacing-lg;
	border-radius: $radius-lg;
	background: linear-gradient(135deg, rgba(115, 103, 240, 0.12), rgba(0, 207, 232, 0.16));
	text-align: right;

	&--secondary {
		background: $bg-subtle;
	}
}

.hero-metric__label {
	display: block;
	font-size: $font-size-xs;
	text-transform: uppercase;
	color: $text-muted;
	margin-bottom: $spacing-xs;
}

.hero-metric__value {
	font-size: $font-size-2xl;
	font-weight: $font-weight-semibold;
}

.stats-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
	gap: $spacing-md;
}

.stat-card {
	display: flex;
	align-items: center;
	gap: $spacing-md;
	padding: $spacing-lg;
}

.stat-icon {
	font-size: $font-size-2xl;
}

.stat-value {
	font-size: $font-size-2xl;
	font-weight: $font-weight-semibold;
	color: $text-primary;
	letter-spacing: $letter-spacing-tight;
}

.stat-label {
	color: $text-muted;
	font-size: $font-size-sm;
}

.stat-detail {
	color: $text-secondary;
	font-size: $font-size-xs;
	margin-top: $spacing-xs;
}

.dashboard-content {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
	gap: $spacing-lg;

	.card--full-width {
		grid-column: 1 / -1;
	}
}

.card {
	h2 {
		margin-bottom: $spacing-md;
		font-size: $font-size-lg;
		font-weight: $font-weight-semibold;
		color: $text-primary;
	}
}

.loading {
	padding: $spacing-xl;
	text-align: center;
	color: $text-muted;
}

.cards-alerts-row {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: $spacing-lg;
	margin-bottom: $spacing-lg;

	.balance-alerts,
	.expiring-cards-alerts {
		margin-bottom: 0;
	}
}

@media (max-width: 768px) {
	.cards-alerts-row {
		grid-template-columns: 1fr;
	}

	.dashboard-hero {
		flex-direction: column;
		align-items: flex-start;
	}

	.dashboard-content {
		grid-template-columns: 1fr;
	}
}

.maintenance-alerts {
	margin-bottom: $spacing-lg;
	border-left: 4px solid $chart-warning-accent;
}

.balance-alerts {
	margin-bottom: $spacing-lg;
	border-left: 4px solid $warning;
}

.expiring-cards-alerts {
	margin-bottom: $spacing-lg;
	border-left: 4px solid $chart-warning-accent;
}

.repair-widget {
	margin-bottom: $spacing-lg;
	border-left: 4px solid $text-secondary;
}

.repair-widget__content {
	display: flex;
	align-items: center;
	gap: $spacing-md;
	flex-wrap: wrap;
}

.repair-widget__icon {
	font-size: 1.25rem;
}

.repair-widget__text {
	flex: 1;
	min-width: 0;
	color: $text-primary;
}

.alerts-ok {
	margin-bottom: $spacing-lg;
	border-left: 4px solid $success;
	display: flex;
	align-items: center;
	gap: $spacing-md;
	padding: $spacing-lg;

	.alerts-ok__icon {
		font-size: 1.5rem;
		color: $success;
		font-weight: $font-weight-bold;
	}

	.alerts-ok__body {
		display: flex;
		flex-direction: column;
		gap: $spacing-xs;
	}

	.alerts-ok__text {
		margin: 0;
		font-weight: $font-weight-semibold;
		color: $text-primary;
	}

	.alerts-ok__hint {
		margin: 0;
		font-size: $font-size-sm;
		color: $text-muted;
	}
}

.alerts-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: $spacing-md;

	h3 {
		margin: 0;
		font-size: $font-size-lg;
		font-weight: $font-weight-semibold;
		color: $text-primary;
	}
}

.alerts-count {
	background: $primary-color;
	color: white;
	padding: $spacing-xs $spacing-sm;
	border-radius: $radius-sm;
	font-size: $font-size-sm;
	font-weight: $font-weight-semibold;
}

.alerts-list {
	display: flex;
	flex-direction: column;
	gap: $spacing-sm;
}

.alert-item {
	display: flex;
	align-items: center;
	gap: $spacing-md;
	padding: $spacing-md;
	background: $bg-subtle;
	border-radius: $radius;
	border-left: 3px solid $chart-warning-accent;
	transition: box-shadow $transition-fast, background-color $transition-fast;

	&.urgent {
		border-left-color: $warning;
		background: $warning-light;
	}

	&:hover {
		box-shadow: $shadow-sm;
	}
}

.alert-icon {
	font-size: $font-size-xl;
}

.alert-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: $spacing-xs;
}

.alert-car,
.alert-card {
	font-weight: $font-weight-semibold;
	color: $text-primary;
}

.alert-details {
	font-size: $font-size-sm;
	color: $text-muted;
}

.quick-actions {
	margin-bottom: $spacing-lg;

	h2 {
		margin-bottom: $spacing-md;
		font-size: $font-size-lg;
		font-weight: $font-weight-semibold;
		color: $text-primary;
	}
}

.actions-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	gap: $spacing-md;
}

.action-btn {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: $spacing-sm;
	padding: $spacing-md;
	background: $bg-elevated;
	border: 1px solid $border-light;
	border-radius: $radius;
	cursor: pointer;
	transition: transform $transition-fast, box-shadow $transition-fast, border-color $transition-fast, background-color $transition-fast;
	text-align: center;

	&:hover {
		background: $primary-light;
		border-color: $primary-color;
		transform: translateY(-2px);
		box-shadow: $shadow-card;
	}
}

.action-icon {
	font-size: $font-size-2xl;
}

.action-label {
	font-size: $font-size-sm;
	font-weight: $font-weight-medium;
	color: $text-primary;
}
</style>
