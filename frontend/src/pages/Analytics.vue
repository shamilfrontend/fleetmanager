<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import LineChart from '@/components/dashboard/LineChart.vue';
import BarChart from '@/components/dashboard/BarChart.vue';
import DoughnutChart from '@/components/dashboard/DoughnutChart.vue';
import AppButton from '@/components/common/AppButton.vue';
import DataTable from '@/components/common/DataTable.vue';
import FormField from '@/components/common/FormField.vue';
import { transactionsApi } from '@/api/transactions';
import { carsApi } from '@/api/cars';
import { employeesApi } from '@/api/employees';
import { formatCurrency, formatNumber } from '@/utils/helpers';
import { useToast } from '@/composables/useToast';
import { getApiErrorMessage } from '@/utils/apiError';
import type {
	Transaction, Car, Employee, PaginatedResponse,
} from '@/types';

const toast = useToast();

const loading = ref(true);
const transactions = ref<Transaction[]>([]);
const cars = ref<Car[]>([]);
const employees = ref<Employee[]>([]);

const getDefaultDates = () => {
	const end = new Date();
	const start = new Date();
	start.setMonth(start.getMonth() - 5);
	return {
		from: start.toISOString().slice(0, 10),
		to: end.toISOString().slice(0, 10),
	};
};

const dateFrom = ref(getDefaultDates().from);
const dateTo = ref(getDefaultDates().to);

const filteredTransactions = computed(() => {
	const list = Array.isArray(transactions.value) ? transactions.value : [];
	if (!dateFrom.value || !dateTo.value) return list;
	const from = new Date(dateFrom.value);
	const to = new Date(dateTo.value);
	to.setHours(23, 59, 59, 999);
	return list.filter((t) => {
		const d = new Date(t.date);
		return d >= from && d <= to;
	});
});

const resetPeriod = () => {
	const { from, to } = getDefaultDates();
	dateFrom.value = from;
	dateTo.value = to;
};

const fuelConsumptionData = computed(() => {
	const list = filteredTransactions.value;
	const from = dateFrom.value ? new Date(dateFrom.value) : new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
	const to = dateTo.value ? new Date(dateTo.value) : new Date();
	const months: string[] = [];
	const monthKeys: { month: number; year: number }[] = [];
	const cur = new Date(from.getFullYear(), from.getMonth(), 1);
	while (cur <= to) {
		months.push(cur.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' }));
		monthKeys.push({ month: cur.getMonth(), year: cur.getFullYear() });
		cur.setMonth(cur.getMonth() + 1);
	}
	if (months.length === 0) {
		months.push(from.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' }));
		monthKeys.push({ month: from.getMonth(), year: from.getFullYear() });
	}

	const monthlyData = monthKeys.map(({ month, year }) => list
		.filter((t) => {
			const tDate = new Date(t.date);
			return tDate.getMonth() === month && tDate.getFullYear() === year;
		})
		.reduce((sum, t) => sum + t.amount, 0));

	return {
		labels: months,
		datasets: [{
			label: 'Расход (руб.)',
			data: monthlyData,
			borderColor: '#01aecb',
			backgroundColor: 'rgba(1, 174, 203, 0.1)',
		}],
	};
});

const carStatusData = computed(() => {
	const statusCounts = cars.value.reduce((acc, car) => {
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
			backgroundColor: ['#27ae60', '#e74c3c', '#f39c12'],
			borderColor: ['#27ae60', '#e74c3c', '#f39c12'],
		}],
	};
});

const topDriversData = computed(() => {
	const driverExpenses = filteredTransactions.value.reduce((acc, t) => {
		const empId = typeof t.employee_id === 'string' ? t.employee_id : (t.employee_id as { _id?: string })?._id ?? '';
		const emp = employees.value.find((e) => e._id === empId);
		if (emp) {
			acc[emp.full_name] = (acc[emp.full_name] || 0) + t.amount;
		}
		return acc;
	}, {} as Record<string, number>);

	const sorted = Object.entries(driverExpenses)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 5);

	return {
		labels: sorted.map(([name]) => name),
		datasets: [{
			label: 'Расход (руб.)',
			data: sorted.map(([, amount]) => amount),
			backgroundColor: '#01aecb',
		}],
	};
});

const fuelTypeData = computed(() => {
	const fuelTypes = filteredTransactions.value.reduce((acc, t) => {
		acc[t.fuel_type] = (acc[t.fuel_type] || 0) + t.amount;
		return acc;
	}, {} as Record<string, number>);

	return {
		labels: Object.keys(fuelTypes),
		datasets: [{
			label: 'Расход (руб.)',
			data: Object.values(fuelTypes),
			backgroundColor: ['#01aecb', '#0288a0', '#27ae60', '#f39c12'],
		}],
	};
});

const totalExpenses = computed(() => filteredTransactions.value.reduce((sum, t) => sum + t.amount, 0));

const avgExpensePerCar = computed(() => (cars.value.length > 0 ? totalExpenses.value / cars.value.length : 0));

const avgVolume = computed(() => {
	if (filteredTransactions.value.length === 0) return 0;
	const totalVolume = filteredTransactions.value.reduce((sum, t) => sum + t.volume, 0);
	return totalVolume / filteredTransactions.value.length;
});

// Рейтинг водителей по экономии
const driversRating = computed(() => {
	const driverStats = filteredTransactions.value.reduce((acc, t) => {
		const empId = typeof t.employee_id === 'string' ? t.employee_id : (t.employee_id as { _id?: string })?._id ?? '';
		const emp = employees.value.find((e) => e._id === empId);

		if (!emp) return acc;

		const driverName = emp.full_name;

		if (!acc[driverName]) {
			acc[driverName] = {
				name: driverName,
				totalAmount: 0,
				totalVolume: 0,
				totalDistance: 0,
				transactionCount: 0,
				cars: new Set<string>(),
			};
		}

		acc[driverName].totalAmount += t.amount;
		acc[driverName].totalVolume += t.volume;
		acc[driverName].transactionCount += 1;

		// Вычисляем пробег между транзакциями (упрощенно)
		const carId = typeof t.car_id === 'string' ? t.car_id : (t.car_id as { _id?: string })?._id ?? '';
		acc[driverName].cars.add(carId);

		return acc;
	}, {} as Record<string, {
		name: string
		totalAmount: number
		totalVolume: number
		totalDistance: number
		transactionCount: number
		cars: Set<string>
	}>);

	// Вычисляем средний расход на 100 км для каждого водителя
	const rating = Object.values(driverStats)
		.map((driver: {
			name: string
			totalAmount: number
			totalVolume: number
			totalDistance: number
			transactionCount: number
			cars: Set<string>
		}) => {
			// Находим все транзакции этого водителя
			const driverTransactions = filteredTransactions.value.filter((t) => {
				const empId = typeof t.employee_id === 'string' ? t.employee_id : (t.employee_id as { _id?: string })?._id ?? '';
				const emp = employees.value.find((e) => e._id === empId);
				return emp?.full_name === driver.name;
			});

			// Вычисляем общий пробег (разница между максимальным и минимальным одометром)
			const odometerReadings = driverTransactions
				.map((t) => t.odometer)
				.filter((od) => od > 0)
				.sort((a, b) => a - b);

			const totalDistance = odometerReadings.length > 1
				? odometerReadings[odometerReadings.length - 1] - odometerReadings[0]
				: 0;

			// Расход на 100 км (литров)
			const consumptionPer100km = totalDistance > 0
				? (driver.totalVolume / totalDistance) * 100
				: 0;

			// Средняя стоимость за литр
			const avgPricePerLiter = driver.totalVolume > 0
				? driver.totalAmount / driver.totalVolume
				: 0;

			// Расход на 100 км (рублей)
			const costPer100km = consumptionPer100km * avgPricePerLiter;

			return {
				name: driver.name,
				totalAmount: driver.totalAmount,
				totalVolume: driver.totalVolume,
				totalDistance,
				transactionCount: driver.transactionCount,
				consumptionPer100km: consumptionPer100km || 0,
				costPer100km: costPer100km || 0,
				avgPricePerLiter: avgPricePerLiter || 0,
				carsCount: driver.cars.size,
			};
		})
		.filter((d: { totalDistance: number }) => d.totalDistance > 0) // Фильтруем водителей с недостаточными данными
		.sort((a: { consumptionPer100km: number }, b: { consumptionPer100km: number }) => a.consumptionPer100km - b.consumptionPer100km) // Сортируем по экономичности (меньше расход = лучше)
		.slice(0, 10); // Топ-10 самых экономичных

	return rating;
});

const ratingColumns = [
	{ key: 'name', label: 'Водитель' },
	{ key: 'consumptionPer100km', label: 'Расход (л/100км)', format: 'number' },
	{ key: 'costPer100km', label: 'Стоимость (руб/100км)', format: 'currency' },
	{ key: 'totalDistance', label: 'Пробег (км)', format: 'number' },
	{ key: 'transactionCount', label: 'Заправок' },
];

// Прогнозирование расходов
const monthlyExpenses = computed(() => {
	const expensesByMonth: Record<string, number> = {};
	filteredTransactions.value.forEach((t) => {
		const date = new Date(t.date);
		const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
		expensesByMonth[monthKey] = (expensesByMonth[monthKey] || 0) + t.amount;
	});

	return Object.values(expensesByMonth);
});

const avgMonthlyExpense = computed(() => {
	if (monthlyExpenses.value.length === 0) return 0;
	const sum = monthlyExpenses.value.reduce((a, b) => a + b, 0);
	return sum / monthlyExpenses.value.length;
});

const forecastNextMonth = computed(() =>
// Простое прогнозирование на основе среднего за последние месяцы
	avgMonthlyExpense.value);

const forecastChange = computed(() => {
	if (monthlyExpenses.value.length < 2) return 0;

	const lastMonth = monthlyExpenses.value[monthlyExpenses.value.length - 1];
	const prevMonth = monthlyExpenses.value[monthlyExpenses.value.length - 2];

	if (prevMonth === 0) return 0;

	return ((lastMonth - prevMonth) / prevMonth) * 100;
});

const forecastChangeText = computed(() => {
	const change = forecastChange.value;
	if (change === 0) return 'Без изменений';
	const sign = change > 0 ? '+' : '';
	return `${sign}${change.toFixed(1)}% к предыдущему месяцу`;
});

const forecastChangeClass = computed(() => {
	const change = forecastChange.value;
	if (change < 0) return 'forecast-positive'; // Снижение расходов - хорошо
	if (change > 0) return 'forecast-negative'; // Рост расходов - плохо
	return '';
});

const loadData = async () => {
	loading.value = true;
	try {
		const [transactionsRes, carsRes, employeesRes] = await Promise.all([
			transactionsApi.getAll(),
			carsApi.getAll(),
			employeesApi.getAll(),
		]) as [PaginatedResponse<Transaction>, PaginatedResponse<Car>, PaginatedResponse<Employee>];
		transactions.value = transactionsRes?.data ?? [];
		cars.value = carsRes?.data ?? [];
		employees.value = employeesRes?.data ?? [];
	} catch (error) {
		toast.error(getApiErrorMessage(error) || 'Не удалось загрузить данные аналитики');
	} finally {
		loading.value = false;
	}
};

onMounted(() => {
	loadData();
});
</script>

<template>
	<div class="analytics-page">
		<h1>Аналитика</h1>

		<div v-if="loading" class="loading" role="status" aria-live="polite" aria-label="Загрузка данных">Загрузка данных...</div>
		<div v-else class="analytics-content">
			<div class="filters card">
				<h3>Период</h3>
				<div class="filters-row">
					<FormField label="Дата от" field-id="analytics-date-from">
						<input id="analytics-date-from" v-model="dateFrom" type="date" class="form-input" />
					</FormField>
					<FormField label="Дата до" field-id="analytics-date-to">
						<input id="analytics-date-to" v-model="dateTo" type="date" class="form-input" />
					</FormField>
					<AppButton variant="secondary" @click="resetPeriod">Сбросить период</AppButton>
				</div>
			</div>

			<div class="charts-grid">
				<div class="card">
					<h3>Расход топлива по месяцам</h3>
					<LineChart :data="fuelConsumptionData" />
				</div>

				<div class="card">
					<h3>Статус автомобилей</h3>
					<DoughnutChart :data="carStatusData" />
				</div>

				<div class="card">
					<h3>Топ-5 водителей по расходам</h3>
					<BarChart :data="topDriversData" />
				</div>

				<div class="card">
					<h3>Рейтинг водителей по экономии</h3>
					<div class="drivers-rating-table">
						<DataTable
							:data="driversRating"
							:columns="ratingColumns"
							:actions="[]"
						/>
					</div>
				</div>

				<div class="card">
					<h3>Расходы по типам топлива</h3>
					<BarChart :data="fuelTypeData" />
				</div>
			</div>

			<div class="stats-summary card">
				<h3>Сводная статистика</h3>
				<div class="stats-grid">
					<div class="stat-item">
						<span class="stat-label">Общий расход за период:</span>
						<span class="stat-value">{{ formatCurrency(totalExpenses) }}</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Средний расход на авто:</span>
						<span class="stat-value">{{ formatCurrency(avgExpensePerCar) }}</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Всего транзакций:</span>
						<span class="stat-value">{{ filteredTransactions.length }}</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Средний объем заправки:</span>
						<span class="stat-value">{{ formatNumber(avgVolume) }} л</span>
					</div>
				</div>
			</div>

			<div class="forecast-section card">
				<h3>Прогнозирование расходов</h3>
				<div class="forecast-grid">
					<div class="forecast-item">
						<span class="forecast-label">Прогноз на следующий месяц:</span>
						<span class="forecast-value">{{ formatCurrency(forecastNextMonth) }}</span>
						<span class="forecast-change" :class="forecastChangeClass">
							{{ forecastChangeText }}
						</span>
					</div>
					<div class="forecast-item">
						<span class="forecast-label">Среднемесячный расход:</span>
						<span class="forecast-value">{{ formatCurrency(avgMonthlyExpense) }}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.analytics-page {
	h1 {
		margin-bottom: $spacing-lg;
	}
}

.loading {
	padding: $spacing-xl;
	text-align: center;
	color: #666;
}

.filters {
	margin-bottom: $spacing-lg;

	h3 {
		margin-bottom: $spacing-md;
	}
}

.filters-row {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	gap: $spacing-md;
}

.filters-row .form-group {
	display: flex;
	flex-direction: column;
	gap: $spacing-xs;
}

.filters-row label {
	font-size: $font-size-sm;
	font-weight: 500;
	color: $text-primary;
}

.filters-row .form-input {
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

.charts-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
	gap: $spacing-lg;
	margin-bottom: $spacing-lg;
}

.card {
	padding: $spacing-lg;

	h3 {
		margin-bottom: $spacing-md;
		font-size: $font-size-lg;
		color: $text-primary;
	}
}

.stats-summary {
	h3 {
		margin-bottom: $spacing-md;
	}
}

.stats-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
	gap: $spacing-md;
}

.stat-item {
	display: flex;
	flex-direction: column;
	gap: $spacing-xs;
	padding: $spacing-md;
	background: $background;
	border-radius: $border-radius;
}

.stat-label {
	font-size: $font-size-sm;
	color: #666;
}

.stat-value {
	font-size: $font-size-lg;
	font-weight: 600;
	color: $primary-color;
}

.drivers-rating-table {
	margin-top: $spacing-md;
}

.forecast-section {
	margin-top: $spacing-lg;

	h3 {
		margin-bottom: $spacing-md;
	}
}

.forecast-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	gap: $spacing-md;
}

.forecast-item {
	display: flex;
	flex-direction: column;
	gap: $spacing-xs;
	padding: $spacing-md;
	background: $background;
	border-radius: $border-radius;
}

.forecast-label {
	font-size: $font-size-sm;
	color: #666;
}

.forecast-value {
	font-size: $font-size-xl;
	font-weight: 600;
	color: $primary-color;
}

.forecast-change {
	font-size: $font-size-sm;
	font-weight: 500;

	&.forecast-positive {
		color: $success;
	}

	&.forecast-negative {
		color: $warning;
	}
}
</style>
