import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FormField from './FormField.vue';

describe('FormField', () => {
	it('renders label when provided', () => {
		const wrapper = mount(FormField, {
			props: { label: 'Email' },
			slots: { default: '<input type="text" />' },
		});
		expect(wrapper.find('label').text()).toContain('Email');
	});

	it('renders error message when provided', () => {
		const wrapper = mount(FormField, {
			props: { label: 'Поле', error: 'Обязательно для заполнения' },
			slots: { default: '<input type="text" />' },
		});
		expect(wrapper.find('.error-message').text()).toBe('Обязательно для заполнения');
	});

	it('shows required asterisk when required', () => {
		const wrapper = mount(FormField, {
			props: { label: 'Пароль', required: true },
			slots: { default: '<input type="password" />' },
		});
		expect(wrapper.find('.required').exists()).toBe(true);
	});

	it('renders slot content', () => {
		const wrapper = mount(FormField, {
			slots: { default: '<input id="test-input" type="text" />' },
		});
		expect(wrapper.find('#test-input').exists()).toBe(true);
	});

	it('sets label for and error id for a11y when fieldId provided', () => {
		const wrapper = mount(FormField, {
			props: { label: 'Email', fieldId: 'email-field', error: 'Invalid' },
			slots: { default: '<input type="text" />' },
		});
		expect(wrapper.find('label').attributes('for')).toBe('email-field');
		expect(wrapper.find('.error-message').attributes('id')).toBe('email-field-error');
		expect(wrapper.find('.error-message').attributes('role')).toBe('alert');
	});
});
