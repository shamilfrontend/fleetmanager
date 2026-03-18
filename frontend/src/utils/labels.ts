/** Человекочитаемые подписи для статусов и типов (машины, карты, ТО). */

export const CAR_STATUS_LABELS: Record<string, string> = {
	active: 'Активен',
	repair: 'В ремонте',
	reserve: 'Резерв',
};

export const CARD_STATUS_LABELS: Record<string, string> = {
	active: 'Активна',
	blocked: 'Заблокирована',
	expired: 'Истекла',
};

export const SERVICE_TYPE_LABELS: Record<string, string> = {
	regular: 'Регулярное ТО',
	repair: 'Ремонт',
	inspection: 'Осмотр',
	tire_change: 'Замена шин',
	oil_change: 'Замена масла',
	other: 'Другое',
};

export function getCarStatusLabel(status: string): string {
	return CAR_STATUS_LABELS[status] ?? status;
}

export function getCardStatusLabel(status: string): string {
	return CARD_STATUS_LABELS[status] ?? status;
}

export function getServiceTypeLabel(type: string): string {
	return SERVICE_TYPE_LABELS[type] ?? type;
}
