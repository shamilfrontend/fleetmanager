import axios from 'axios';
import { API_BASE_URL } from '@/utils/constants';

const apiClient = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
});

let onUnauthorized: (() => void | Promise<void>) | null = null;
let onError: ((message: string) => void) | null = null;

export function setApiErrorHandlers(handlers: {
	onUnauthorized?: () => void | Promise<void>
	onError?: (message: string) => void
}) {
	onUnauthorized = handlers.onUnauthorized ?? null;
	onError = handlers.onError ?? null;
}

apiClient.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('token');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
	(response) => response,
	(error) => {
		const status = error.response?.status;
		const message = error.response?.data?.message || error.message || 'Ошибка запроса';

		if (status === 401) {
			if (onUnauthorized) {
				Promise.resolve(onUnauthorized()).catch(() => {});
			} else {
				localStorage.removeItem('token');
				localStorage.removeItem('refreshToken');
				window.location.href = '/login';
			}
		} else if (onError && status && status >= 400) {
			onError(message);
		}

		return Promise.reject(error);
	},
);

export default apiClient;
