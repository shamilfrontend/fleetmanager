import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCarsStore } from './cars';

const mockCarsApi = vi.hoisted(() => ({
	getAll: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
}));

vi.mock('@/api/cars', () => ({ carsApi: mockCarsApi }));

describe('useCarsStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('starts with empty cars and zero total', () => {
		const store = useCarsStore();
		expect(store.cars).toEqual([]);
		expect(store.total).toBe(0);
		expect(store.loading).toBe(false);
		expect(store.error).toBeNull();
	});

	it('fetchCars sets cars and total', async () => {
		const store = useCarsStore();
		const cars = [
			{ _id: '1', brand: 'Toyota', model: 'Camry', plate_number: 'A123', year: 2020, mileage: 10000, status: 'active' },
		];
		mockCarsApi.getAll.mockResolvedValue({ data: cars, total: 1, page: 1, limit: 10 });
		await store.fetchCars({ page: 1, limit: 10 });
		expect(store.cars).toEqual(cars);
		expect(store.total).toBe(1);
		expect(store.loading).toBe(false);
		expect(store.error).toBeNull();
	});

	it('fetchCars sets error on failure', async () => {
		const store = useCarsStore();
		mockCarsApi.getAll.mockRejectedValue(new Error('Network error'));
		await store.fetchCars();
		expect(store.error).toBe('Network error');
		expect(store.loading).toBe(false);
	});

	it('createCar appends car and increments total', async () => {
		const store = useCarsStore();
		store.cars = [];
		store.total = 0;
		const newCar = { _id: '1', brand: 'BMW', model: 'X5', plate_number: 'B456', year: 2021, mileage: 0, status: 'active' };
		mockCarsApi.create.mockResolvedValue(newCar);
		const result = await store.createCar({ brand: 'BMW', model: 'X5', plate_number: 'B456', year: 2021 });
		expect(store.cars).toHaveLength(1);
		expect(store.cars[0]).toEqual(newCar);
		expect(store.total).toBe(1);
		expect(result).toEqual(newCar);
	});

	it('updateCar updates item in list', async () => {
		const store = useCarsStore();
		store.cars = [
			{ _id: '1', brand: 'Toyota', model: 'Camry', plate_number: 'A123', year: 2020, mileage: 10000, status: 'active' },
		];
		const updated = { _id: '1', brand: 'Toyota', model: 'Corolla', plate_number: 'A123', year: 2020, mileage: 10000, status: 'active' };
		mockCarsApi.update.mockResolvedValue(updated);
		await store.updateCar('1', { model: 'Corolla' });
		expect(store.cars[0].model).toBe('Corolla');
	});

	it('deleteCar removes car and decrements total', async () => {
		const store = useCarsStore();
		store.cars = [
			{ _id: '1', brand: 'Toyota', model: 'Camry', plate_number: 'A123', year: 2020, mileage: 10000, status: 'active' },
		];
		store.total = 1;
		mockCarsApi.delete.mockResolvedValue(undefined);
		await store.deleteCar('1');
		expect(store.cars).toHaveLength(0);
		expect(store.total).toBe(0);
	});
});
