export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

/** Базовый URL сервера (без /api) для формирования ссылок на статику, например /uploads */
export const API_ORIGIN =
  API_BASE_URL.replace(/\/api\/?$/, '') ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5002');

export const ROLES = {
	ADMIN: 'admin',
	MANAGER: 'manager',
	DRIVER: 'driver',
} as const;

export const CAR_STATUS = {
	ACTIVE: 'active',
	REPAIR: 'repair',
	RESERVE: 'reserve',
} as const;

export const CARD_STATUS = {
	ACTIVE: 'active',
	BLOCKED: 'blocked',
	EXPIRED: 'expired',
} as const;

export const TRANSACTION_STATUS = {
	COMPLETED: 'completed',
	PENDING: 'pending',
	CANCELLED: 'cancelled',
} as const;
