export const formatDate = (date: string | Date): string => {
	const d = new Date(date);
	return d.toLocaleDateString('ru-RU', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	});
};

export const formatDateTime = (date: string | Date): string => {
	const d = new Date(date);
	return d.toLocaleString('ru-RU', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
};

export const formatCurrency = (amount: number): string => new Intl.NumberFormat('ru-RU', {
	style: 'currency',
	currency: 'RUB',
}).format(amount);

export const formatNumber = (num: number): string => new Intl.NumberFormat('ru-RU').format(num);

/** Оставляет только цифры (для отправки в API/БД). */
export const normalizeCardNumber = (cardNumber: string): string =>
	(String(cardNumber ?? '').replace(/\D/g, ''));

/** Форматирует номер карты: XXXX XXXX XXXX XXXX. */
export const formatCardNumber = (cardNumber: string): string => {
	const digits = normalizeCardNumber(cardNumber);
	if (!digits) return '';
	return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};
