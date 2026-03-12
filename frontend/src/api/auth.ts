import apiClient from './axios';

export interface LoginCredentials {
	email: string
	password: string
}

export interface RegisterData {
	email: string
	password: string
	role: string
}

export interface AuthResponse {
	token: string
	refreshToken: string
	user: {
		_id: string
		email: string
		role: string
	}
}

export const authApi = {
	login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
		const { data } = await apiClient.post('/auth/login', credentials);
		return data;
	},

	register: async (userData: RegisterData): Promise<AuthResponse> => {
		const { data } = await apiClient.post('/auth/register', userData);
		return data;
	},

	getUsers: async (): Promise<{ _id: string; email: string; role: string }[]> => {
		const { data } = await apiClient.get('/auth/users');
		return data;
	},

	createUser: async (userData: RegisterData): Promise<{ message: string; user: { _id: string; email: string; role: string } }> => {
		const { data } = await apiClient.post('/auth/users', userData);
		return data;
	},

	updateUserRole: async (id: string, role: string): Promise<{ user: { _id: string; email: string; role: string } }> => {
		const { data } = await apiClient.put(`/auth/users/${id}`, { role });
		return data;
	},

	deleteUser: async (id: string): Promise<void> => {
		await apiClient.delete(`/auth/users/${id}`);
	},

	refreshToken: async (refreshToken: string): Promise<{ token: string }> => {
		const { data } = await apiClient.post('/auth/refresh', { refreshToken });
		return data;
	},

	logout: async (): Promise<void> => {
		await apiClient.post('/auth/logout');
	},

	getMe: async (): Promise<{ _id: string; email: string; role: string }> => {
		const { data } = await apiClient.get('/auth/me');
		return data;
	},

	changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
		await apiClient.post('/auth/change-password', {
			currentPassword,
			newPassword,
		});
	},
};
