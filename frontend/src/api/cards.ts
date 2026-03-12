import apiClient from './axios';
import type { Card, PaginatedResponse } from '@/types';

export interface CardsListParams {
	page?: number
	limit?: number
	status?: string
	type?: 'fuel' | 'service'
}

export const cardsApi = {
	getAll: async (params?: CardsListParams): Promise<PaginatedResponse<Card>> => {
		const { data } = await apiClient.get('/cards', { params });
		return data;
	},

	getById: async (id: string): Promise<Card> => {
		const { data } = await apiClient.get(`/cards/${id}`);
		return data;
	},

	create: async (card: Partial<Card>): Promise<Card> => {
		const { data } = await apiClient.post('/cards', card);
		return data;
	},

	update: async (id: string, card: Partial<Card>): Promise<Card> => {
		const { data } = await apiClient.put(`/cards/${id}`, card);
		return data;
	},

	delete: async (id: string): Promise<void> => {
		await apiClient.delete(`/cards/${id}`);
	},
};
