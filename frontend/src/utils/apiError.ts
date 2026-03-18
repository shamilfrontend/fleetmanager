import axios from 'axios';
import type { ApiErrorBody } from '@/types';

const DEFAULT_MESSAGE = 'Ошибка запроса';

/**
 * Извлекает сообщение об ошибке из ответа API или из перехваченного исключения.
 * Использует единый формат API: { message, errors? }.
 * @param fallback — подставляется, когда из error не удалось извлечь сообщение (результат был бы DEFAULT_MESSAGE).
 */
export function getApiErrorMessage(error: unknown, fallback?: string): string {
	if (axios.isAxiosError(error) && error.response?.data) {
		const data = error.response.data as ApiErrorBody;
		if (typeof data?.message === 'string') return data.message;
	}
	if (error instanceof Error && error.message) return error.message;
	return fallback ?? DEFAULT_MESSAGE;
}
