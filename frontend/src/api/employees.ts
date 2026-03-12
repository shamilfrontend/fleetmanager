import apiClient from './axios';
import type { Employee, PaginatedResponse } from '@/types';

export interface EmployeesListParams {
	page?: number
	limit?: number
	status?: string
}

export const employeesApi = {
	getAll: async (params?: EmployeesListParams): Promise<PaginatedResponse<Employee>> => {
		const { data } = await apiClient.get('/employees', { params });
		return data;
	},

	getById: async (id: string): Promise<Employee> => {
		const { data } = await apiClient.get(`/employees/${id}`);
		return data;
	},

	create: async (employee: Partial<Employee>): Promise<Employee> => {
		const { data } = await apiClient.post('/employees', employee);
		return data;
	},

	update: async (id: string, employee: Partial<Employee>): Promise<Employee> => {
		const { data } = await apiClient.put(`/employees/${id}`, employee);
		return data;
	},

	delete: async (id: string): Promise<void> => {
		await apiClient.delete(`/employees/${id}`);
	},
};
