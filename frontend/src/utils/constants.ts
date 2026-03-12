export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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
