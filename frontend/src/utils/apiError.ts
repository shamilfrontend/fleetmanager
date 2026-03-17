import axios from 'axios';
import type { ApiErrorBody } from '@/types';

const DEFAULT_MESSAGE = 'Ошибка запроса';

/**
 * Извлекает сообщение об ошибке из ответа API или из перехваченного исключения.
 * Использует единый формат API: { message, errors? }.
 */
export function getApiErrorMessage(error: unknown): string {
	if (axios.isAxiosError(error) && error.response?.data) {
		const data = error.response.data as ApiErrorBody;
		if (typeof data?.message === 'string') return data.message;
	}
	if (error instanceof Error) return error.message;
	return DEFAULT_MESSAGE;
}
