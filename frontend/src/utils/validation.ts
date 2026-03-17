export interface ValidationRule {
	required?: boolean
	min?: number
	max?: number
	minLength?: number
	maxLength?: number
	pattern?: RegExp
	custom?: (value: unknown) => boolean | string
}

export interface ValidationErrors {
	[key: string]: string
}

export const validateField = (value: unknown, rules: ValidationRule, fieldName: string): string | null => {
	if (rules.required && (value === null || value === undefined || value === '')) {
		return `${fieldName} обязателен для заполнения`;
	}

	if (value === null || value === undefined || value === '') {
		return null; // Необязательное поле пустое - это нормально
	}

	if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
		return `${fieldName} должен быть не менее ${rules.min}`;
	}

	if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
		return `${fieldName} должен быть не более ${rules.max}`;
	}

	if (rules.minLength !== undefined && String(value).length < rules.minLength) {
		return `${fieldName} должен содержать не менее ${rules.minLength} символов`;
	}

	if (rules.maxLength !== undefined && String(value).length > rules.maxLength) {
		return `${fieldName} должен содержать не более ${rules.maxLength} символов`;
	}

	if (rules.pattern && !rules.pattern.test(String(value))) {
		return `${fieldName} имеет неверный формат`;
	}

	if (rules.custom) {
		const result = rules.custom(value);
		if (result !== true) {
			return typeof result === 'string' ? result : `${fieldName} имеет неверное значение`;
		}
	}

	return null;
};

export const validateForm = <T extends Record<string, unknown>>(
	data: T,
	rules: Record<keyof T, ValidationRule>,
): ValidationErrors => {
	const errors: ValidationErrors = {};

	for (const [field, fieldRules] of Object.entries(rules)) {
		const error = validateField(data[field], fieldRules, field);
		if (error) {
			errors[field] = error;
		}
	}

	return errors;
};
