import { defineStore } from 'pinia';
import { ref } from 'vue';
import { employeesApi } from '@/api/employees';
import type { Employee } from '@/types';

export interface EmployeesFetchParams {
	page?: number
	limit?: number
	status?: string
}

export const useEmployeesStore = defineStore('employees', () => {
	const employees = ref<Employee[]>([]);
	const total = ref(0);
	const loading = ref(false);
	const error = ref<string | null>(null);

	const fetchEmployees = async (params?: EmployeesFetchParams) => {
		loading.value = true;
		error.value = null;
		try {
			const query = params ?? { page: 1, limit: 1000 };
			const res = await employeesApi.getAll(query);
			employees.value = res.data;
			total.value = res.total;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Ошибка загрузки сотрудников';
		} finally {
			loading.value = false;
		}
	};

	const createEmployee = async (employee: Partial<Employee>) => {
		loading.value = true;
		try {
			const newEmployee = await employeesApi.create(employee);
			total.value += 1;
			employees.value.push(newEmployee);
			return newEmployee;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Ошибка создания сотрудника';
			throw err;
		} finally {
			loading.value = false;
		}
	};

	const updateEmployee = async (id: string, employee: Partial<Employee>) => {
		loading.value = true;
		try {
			const updatedEmployee = await employeesApi.update(id, employee);
			const index = employees.value.findIndex((e) => e._id === id);
			if (index !== -1) {
				employees.value[index] = updatedEmployee;
			}
			return updatedEmployee;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Ошибка обновления сотрудника';
			throw err;
		} finally {
			loading.value = false;
		}
	};

	const deleteEmployee = async (id: string) => {
		loading.value = true;
		try {
			await employeesApi.delete(id);
			employees.value = employees.value.filter((e) => e._id !== id);
			total.value = Math.max(0, total.value - 1);
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Ошибка удаления сотрудника';
			throw err;
		} finally {
			loading.value = false;
		}
	};

	return {
		employees,
		total,
		loading,
		error,
		fetchEmployees,
		createEmployee,
		updateEmployee,
		deleteEmployee,
	};
});
