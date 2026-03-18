import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AppDatePicker from './AppDatePicker.vue';

const mockSetDate = vi.fn();
const mockClear = vi.fn();
const mockDestroy = vi.fn();

vi.mock('flatpickr', () => ({
	default: vi.fn(() => ({
		setDate: mockSetDate,
		clear: mockClear,
		destroy: mockDestroy,
	})),
}));

vi.mock('flatpickr/dist/flatpickr.min.css', () => ({}));

describe('AppDatePicker', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders input with placeholder when no value', () => {
		const wrapper = mount(AppDatePicker, {
			props: { modelValue: null, placeholder: 'Выберите дату' },
		});
		const input = wrapper.find('input[data-input]');
		expect(input.exists()).toBe(true);
		expect(input.attributes('placeholder')).toBe('Выберите дату');
	});

	it('uses fieldId on input for a11y', () => {
		const wrapper = mount(AppDatePicker, {
			props: { modelValue: null, fieldId: 'analytics-date-from' },
		});
		expect(wrapper.find('input').attributes('id')).toBe('analytics-date-from');
	});

	it('shows clear button when clearable and has value', () => {
		const wrapper = mount(AppDatePicker, {
			props: { modelValue: '2025-03-18', clearable: true },
		});
		expect(wrapper.find('.app-date-picker__clear').exists()).toBe(true);
	});

	it('hides clear button when no value', () => {
		const wrapper = mount(AppDatePicker, {
			props: { modelValue: null, clearable: true },
		});
		expect(wrapper.find('.app-date-picker__clear').exists()).toBe(false);
	});

	it('emits update:modelValue null when clear is clicked', async () => {
		const wrapper = mount(AppDatePicker, {
			props: { modelValue: '2025-03-18', clearable: true },
		});
		await wrapper.find('.app-date-picker__clear').trigger('click');
		expect(mockClear).toHaveBeenCalled();
		expect(wrapper.emitted('update:modelValue')).toEqual([[null]]);
	});

	it('has disabled class and disabled input when disabled prop is true', () => {
		const wrapper = mount(AppDatePicker, {
			props: { modelValue: null, disabled: true },
		});
		expect(wrapper.find('.app-date-picker--disabled').exists()).toBe(true);
		expect(wrapper.find('input').attributes('disabled')).toBeDefined();
	});

	it('initializes flatpickr with modelValue as defaultDate', () => {
		mount(AppDatePicker, {
			props: { modelValue: '2025-03-18' },
		});
		expect(mockSetDate).toHaveBeenCalledWith(expect.any(Date), false);
	});

	it('calls destroy on unmount', () => {
		const wrapper = mount(AppDatePicker, { props: { modelValue: null } });
		wrapper.unmount();
		expect(mockDestroy).toHaveBeenCalled();
	});
});
