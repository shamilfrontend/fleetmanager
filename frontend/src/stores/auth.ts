import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api/auth';
import type { User } from '@/types';

export const useAuthStore = defineStore('auth', () => {
	const user = ref<User | null>(null);
	const token = ref<string | null>(localStorage.getItem('token'));
	const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'));

	const isAuthenticated = computed(() => !!token.value && !!user.value);
	const isAdmin = computed(() => user.value?.role === 'admin');
	const isManager = computed(() => user.value?.role === 'manager' || isAdmin.value);
	const isDriver = computed(() => user.value?.role === 'driver');

	const login = async (email: string, password: string) => {
		const response = await authApi.login({ email, password });
		token.value = response.token;
		refreshToken.value = response.refreshToken;
		user.value = response.user as User;
		localStorage.setItem('token', response.token);
		localStorage.setItem('refreshToken', response.refreshToken);
	};

	const register = async (email: string, password: string, role: string = 'driver') => {
		const response = await authApi.register({ email, password, role });
		token.value = response.token;
		refreshToken.value = response.refreshToken;
		user.value = response.user as User;
		localStorage.setItem('token', response.token);
		localStorage.setItem('refreshToken', response.refreshToken);
	};

	const logout = async () => {
		await authApi.logout();
		token.value = null;
		refreshToken.value = null;
		user.value = null;
		localStorage.removeItem('token');
		localStorage.removeItem('refreshToken');
	};

	const setUser = (userData: User) => {
		user.value = userData;
	};

	const initAuth = async () => {
		const savedToken = localStorage.getItem('token');
		if (savedToken) {
			token.value = savedToken;
			try {
				const userData = await authApi.getMe();
				user.value = userData as User;
			} catch (error) {
				// Токен недействителен, очищаем хранилище
				console.error('Ошибка восстановления сессии:', error);
				token.value = null;
				refreshToken.value = null;
				user.value = null;
				localStorage.removeItem('token');
				localStorage.removeItem('refreshToken');
			}
		}
	};

	return {
		user,
		token,
		refreshToken,
		isAuthenticated,
		isAdmin,
		isManager,
		isDriver,
		login,
		register,
		logout,
		setUser,
		initAuth,
	};
});
