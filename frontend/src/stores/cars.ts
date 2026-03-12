import { defineStore } from 'pinia';
import { ref } from 'vue';
import { carsApi } from '@/api/cars';
import type { Car } from '@/types';

export interface CarsFetchParams {
	page?: number
	limit?: number
	status?: string
}

export const useCarsStore = defineStore('cars', () => {
	const cars = ref<Car[]>([]);
	const total = ref(0);
	const loading = ref(false);
	const error = ref<string | null>(null);

	const fetchCars = async (params?: CarsFetchParams) => {
		loading.value = true;
		error.value = null;
		try {
			const query = params ?? { page: 1, limit: 1000 };
			const res = await carsApi.getAll(query);
			cars.value = res.data;
			total.value = res.total;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Ошибка загрузки автомобилей';
		} finally {
			loading.value = false;
		}
	};

	const createCar = async (car: Partial<Car>) => {
		loading.value = true;
		try {
			const newCar = await carsApi.create(car);
			total.value += 1;
			cars.value.push(newCar);
			return newCar;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Ошибка создания автомобиля';
			throw err;
		} finally {
			loading.value = false;
		}
	};

	const updateCar = async (id: string, car: Partial<Car>) => {
		loading.value = true;
		try {
			const updatedCar = await carsApi.update(id, car);
			const index = cars.value.findIndex((c) => c._id === id);
			if (index !== -1) {
				cars.value[index] = updatedCar;
			}
			return updatedCar;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Ошибка обновления автомобиля';
			throw err;
		} finally {
			loading.value = false;
		}
	};

	const deleteCar = async (id: string) => {
		loading.value = true;
		try {
			await carsApi.delete(id);
			cars.value = cars.value.filter((c) => c._id !== id);
			total.value = Math.max(0, total.value - 1);
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Ошибка удаления автомобиля';
			throw err;
		} finally {
			loading.value = false;
		}
	};

	return {
		cars,
		total,
		loading,
		error,
		fetchCars,
		createCar,
		updateCar,
		deleteCar,
	};
});
