import apiClient from './axios';
import type { Car, PaginatedResponse } from '@/types';

export interface CarsListParams {
	page?: number
	limit?: number
	status?: string
}

export const carsApi = {
	getAll: async (params?: CarsListParams): Promise<PaginatedResponse<Car>> => {
		const { data } = await apiClient.get('/cars', { params });
		return data;
	},

	getById: async (id: string): Promise<Car> => {
		const { data } = await apiClient.get(`/cars/${id}`);
		return data;
	},

	create: async (car: Partial<Car>): Promise<Car> => {
		const { data } = await apiClient.post('/cars', car);
		return data;
	},

	update: async (id: string, car: Partial<Car>): Promise<Car> => {
		const { data } = await apiClient.put(`/cars/${id}`, car);
		return data;
	},

	delete: async (id: string): Promise<void> => {
		await apiClient.delete(`/cars/${id}`);
	},

	uploadPhoto: async (id: string, file: File): Promise<{ photo: string; car: Car }> => {
		const formData = new FormData();
		formData.append('photo', file);
		const { data } = await apiClient.post(`/cars/${id}/photos`, formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		});
		return data;
	},

	deletePhoto: async (id: string, photoPath: string): Promise<Car> => {
		const { data } = await apiClient.delete(`/cars/${id}/photos`, {
			data: { photoPath },
		});
		return data.car;
	},

	uploadDocument: async (id: string, file: File): Promise<{ document: string; car: Car }> => {
		const formData = new FormData();
		formData.append('document', file);
		const { data } = await apiClient.post(`/cars/${id}/documents`, formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		});
		return data;
	},

	deleteDocument: async (id: string, documentPath: string): Promise<Car> => {
		const { data } = await apiClient.delete(`/cars/${id}/documents`, {
			data: { documentPath },
		});
		return data.car;
	},
};
