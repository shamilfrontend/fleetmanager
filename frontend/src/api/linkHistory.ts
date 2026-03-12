import apiClient from './axios';

export interface LinkHistory {
	_id: string
	link_type: 'employee-card' | 'employee-car' | 'card-car'
	employee_id?: {
		_id: string
		full_name: string
	}
	card_id?: {
		_id: string
		card_number: string
	}
	car_id?: {
		_id: string
		brand: string
		model: string
		plate_number: string
	}
	action: 'assigned' | 'unassigned' | 'changed'
	previous_value: any
	new_value: any
	changed_by: {
		_id: string
		email: string
	}
	created_at: string
}

export interface LinkHistoryFilters {
	linkType?: string
	employeeId?: string
	cardId?: string
	carId?: string
	limit?: number
	offset?: number
}

export const linkHistoryApi = {
	getAll: async (filters?: LinkHistoryFilters): Promise<{ data: LinkHistory[]; total: number }> => {
		const { data } = await apiClient.get('/link-history', { params: filters });
		return data;
	},

	getById: async (id: string): Promise<LinkHistory> => {
		const { data } = await apiClient.get(`/link-history/${id}`);
		return data;
	},
};
