import apiClient from './axios';

export interface MaintenanceHistory {
	_id: string
	car_id: {
		_id: string
		brand: string
		model: string
		plate_number: string
	}
	service_type: 'regular' | 'repair' | 'inspection' | 'tire_change' | 'oil_change' | 'other'
	description: string
	cost: number
	mileage: number
	service_date: string
	next_service_date?: string
	next_service_mileage?: number
	service_provider?: string
	documents?: string[]
	performed_by: {
		_id: string
		email: string
	}
	created_at: string
	updated_at: string
}

export interface MaintenanceFilters {
	carId?: string
}

export interface UpcomingMaintenance {
	car: {
		_id: string
		brand: string
		model: string
		plate_number: string
		mileage: number
		status: string
	}
	maintenance: MaintenanceHistory
	nextServiceDate?: string
	remainingMileage?: number
	type: 'date' | 'mileage'
}

export interface UpcomingMaintenanceResponse {
	upcoming: UpcomingMaintenance[]
	upcomingByMileage: UpcomingMaintenance[]
}

export const maintenanceApi = {
	getAll: async (filters?: MaintenanceFilters): Promise<MaintenanceHistory[]> => {
		const { data } = await apiClient.get('/maintenance', { params: filters });
		return data;
	},

	getById: async (id: string): Promise<MaintenanceHistory> => {
		const { data } = await apiClient.get(`/maintenance/${id}`);
		return data;
	},

	getUpcoming: async (days?: number): Promise<UpcomingMaintenanceResponse> => {
		const { data } = await apiClient.get('/maintenance/upcoming', { params: { days } });
		return data;
	},

	create: async (maintenance: Partial<MaintenanceHistory>): Promise<MaintenanceHistory> => {
		const { data } = await apiClient.post('/maintenance', maintenance);
		return data;
	},

	update: async (id: string, maintenance: Partial<MaintenanceHistory>): Promise<MaintenanceHistory> => {
		const { data } = await apiClient.put(`/maintenance/${id}`, maintenance);
		return data;
	},

	delete: async (id: string): Promise<void> => {
		await apiClient.delete(`/maintenance/${id}`);
	},
};
