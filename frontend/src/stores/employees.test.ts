import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useEmployeesStore } from './employees';

const mockEmployeesApi = vi.hoisted(() => ({
	getAll: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
}));

vi.mock('@/api/employees', () => ({ employeesApi: mockEmployeesApi }));

describe('useEmployeesStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('starts with empty employees and zero total', () => {
		const store = useEmployeesStore();
		expect(store.employees).toEqual([]);
		expect(store.total).toBe(0);
		expect(store.loading).toBe(false);
		expect(store.error).toBeNull();
	});

	it('fetchEmployees sets employees and total', async () => {
		const store = useEmployeesStore();
		const employees = [
			{ _id: '1', full_name: 'Иван Иванов', email: 'ivan@test.ru', role: 'driver', status: 'active', created_at: '', updated_at: '' },
		];
		mockEmployeesApi.getAll.mockResolvedValue({ data: employees, total: 1, page: 1, limit: 10 });
		await store.fetchEmployees({ page: 1, limit: 10 });
		expect(store.employees).toEqual(employees);
		expect(store.total).toBe(1);
		expect(store.loading).toBe(false);
		expect(store.error).toBeNull();
	});

	it('fetchEmployees sets error on failure', async () => {
		const store = useEmployeesStore();
		mockEmployeesApi.getAll.mockRejectedValue(new Error('Network error'));
		await store.fetchEmployees();
		expect(store.error).toBe('Network error');
		expect(store.loading).toBe(false);
	});

	it('createEmployee appends employee and increments total', async () => {
		const store = useEmployeesStore();
		store.employees = [];
		store.total = 0;
		const newEmployee = { _id: '1', full_name: 'Петр Петров', email: 'petr@test.ru', role: 'driver', status: 'active', created_at: '', updated_at: '' };
		mockEmployeesApi.create.mockResolvedValue(newEmployee);
		const result = await store.createEmployee({ full_name: 'Петр Петров', email: 'petr@test.ru', role: 'driver' });
		expect(store.employees).toHaveLength(1);
		expect(store.employees[0]).toEqual(newEmployee);
		expect(store.total).toBe(1);
		expect(result).toEqual(newEmployee);
	});

	it('updateEmployee updates item in list', async () => {
		const store = useEmployeesStore();
		store.employees = [
			{ _id: '1', full_name: 'Иван', email: 'i@r.ru', role: 'driver', status: 'active', created_at: '', updated_at: '' },
		];
		const updated = { _id: '1', full_name: 'Иван Иванов', email: 'i@r.ru', role: 'driver', status: 'active', created_at: '', updated_at: '' };
		mockEmployeesApi.update.mockResolvedValue(updated);
		await store.updateEmployee('1', { full_name: 'Иван Иванов' });
		expect(store.employees[0].full_name).toBe('Иван Иванов');
	});

	it('deleteEmployee removes employee and decrements total', async () => {
		const store = useEmployeesStore();
		store.employees = [
			{ _id: '1', full_name: 'Иван', email: 'i@r.ru', role: 'driver', status: 'active', created_at: '', updated_at: '' },
		];
		store.total = 1;
		mockEmployeesApi.delete.mockResolvedValue(undefined);
		await store.deleteEmployee('1');
		expect(store.employees).toHaveLength(0);
		expect(store.total).toBe(0);
	});
});
