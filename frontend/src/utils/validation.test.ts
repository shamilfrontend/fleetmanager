import { describe, it, expect } from 'vitest';
import { validateField, validateForm } from './validation';

describe('validateField', () => {
	it('returns error when required field is empty', () => {
		expect(validateField('', { required: true }, 'Поле')).toBe('Поле обязателен для заполнения');
		expect(validateField(null, { required: true }, 'Email')).toBe('Email обязателен для заполнения');
		expect(validateField(undefined, { required: true }, 'Пароль')).toBe('Пароль обязателен для заполнения');
	});

	it('returns null when optional field is empty', () => {
		expect(validateField('', {}, 'Поле')).toBeNull();
		expect(validateField(null, {}, 'Поле')).toBeNull();
	});

	it('validates minLength', () => {
		expect(validateField('ab', { minLength: 3 }, 'VIN')).toBe('VIN должен содержать не менее 3 символов');
		expect(validateField('abc', { minLength: 3 }, 'VIN')).toBeNull();
	});

	it('validates maxLength', () => {
		expect(validateField('abcd', { maxLength: 3 }, 'Код')).toBe('Код должен содержать не более 3 символов');
		expect(validateField('abc', { maxLength: 3 }, 'Код')).toBeNull();
	});

	it('validates min/max for numbers', () => {
		expect(validateField(5, { min: 10 }, 'Число')).toBe('Число должен быть не менее 10');
		expect(validateField(15, { max: 10 }, 'Число')).toBe('Число должен быть не более 10');
		expect(validateField(10, { min: 10, max: 10 }, 'Число')).toBeNull();
	});

	it('validates pattern', () => {
		expect(validateField('abc', { pattern: /^\d+$/ }, 'Код')).toBe('Код имеет неверный формат');
		expect(validateField('123', { pattern: /^\d+$/ }, 'Код')).toBeNull();
	});

	it('validates custom and returns string error', () => {
		expect(validateField('x', { custom: (v) => (v === 'ok' ? true : 'Должно быть ok') }, 'Поле')).toBe('Должно быть ok');
		expect(validateField('ok', { custom: (v) => v === 'ok' }, 'Поле')).toBeNull();
	});

	it('passes context to custom', () => {
		const errors = validateForm(
			{ a: '1', b: '2' },
			{
				b: { custom: (v, ctx) => (v === ctx?.a ? true : 'Поля должны совпадать'), label: 'B' },
			},
		);
		expect(errors.b).toBe('Поля должны совпадать');
		const ok = validateForm(
			{ a: 'x', b: 'x' },
			{
				b: { custom: (v, ctx) => (v === ctx?.a ? true : 'Поля должны совпадать'), label: 'B' },
			},
		);
		expect(ok.b).toBeUndefined();
	});
});

describe('validateForm', () => {
	it('returns empty object when all valid', () => {
		const errors = validateForm(
			{ email: 'a@b.ru', password: 'secret' },
			{
				email: { required: true, label: 'Email' },
				password: { required: true, minLength: 3, label: 'Пароль' },
			},
		);
		expect(errors).toEqual({});
	});

	it('returns errors for invalid fields', () => {
		const errors = validateForm(
			{ email: '', password: 'ab' },
			{
				email: { required: true, label: 'Email' },
				password: { required: true, minLength: 6, label: 'Пароль' },
			},
		);
		expect(errors.email).toBe('Email обязателен для заполнения');
		expect(errors.password).toBe('Пароль должен содержать не менее 6 символов');
	});

	it('uses label from rule when provided', () => {
		const errors = validateForm(
			{ name: '' },
			{ name: { required: true, label: 'Имя пользователя' } },
		);
		expect(errors.name).toBe('Имя пользователя обязателен для заполнения');
	});
});
