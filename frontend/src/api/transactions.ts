import apiClient from './axios';
import type { Transaction, PaginatedResponse } from '@/types';

export interface TransactionFilters {
	dateFrom?: string | null
	dateTo?: string | null
	employeeId?: string
	carId?: string
	cardId?: string
	status?: string
	page?: number
	limit?: number
}

export const transactionsApi = {
	getAll: async (filters?: TransactionFilters): Promise<PaginatedResponse<Transaction>> => {
		const { data } = await apiClient.get('/transactions', { params: filters });
		return data;
	},

	getById: async (id: string): Promise<Transaction> => {
		const { data } = await apiClient.get(`/transactions/${id}`);
		return data;
	},

	create: async (transaction: Partial<Transaction>): Promise<Transaction> => {
		const { data } = await apiClient.post('/transactions', transaction);
		return data;
	},

	update: async (id: string, transaction: Partial<Transaction>): Promise<Transaction> => {
		const { data } = await apiClient.put(`/transactions/${id}`, transaction);
		return data;
	},

	delete: async (id: string): Promise<void> => {
		await apiClient.delete(`/transactions/${id}`);
	},
};
