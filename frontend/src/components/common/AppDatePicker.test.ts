import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AppDatePicker from './AppDatePicker.vue';

const mockSetDate = vi.fn();
const mockClear = vi.fn();
const mockDestroy = vi.fn();

const flatpickrOptionsSpy = vi.fn();

const createCalendarContainer = () => {
	const container = document.createElement('div');
	container.className = 'flatpickr-calendar';
	const days = document.createElement('div');
	days.className = 'flatpickr-days';
	container.appendChild(days);
	return container;
};

vi.mock('flatpickr', () => ({
	default: vi.fn((_: unknown, options: unknown) => {
		flatpickrOptionsSpy(options);
		return {
			setDate: mockSetDate,
			clear: mockClear,
			destroy: mockDestroy,
			calendarContainer: createCalendarContainer(),
			selectedDates: [],
			close: vi.fn(),
		};
	}),
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

	it('emits year string in year mode and configures flatpickr for year-only', async () => {
		const wrapper = mount(AppDatePicker, {
			props: {
				modelValue: '2024',
				mode: 'year',
			},
		});

		// имитируем выбор даты flatpickr
		const selected = [new Date(2024, 0, 1)];
		// последний вызов flatpickrOptionsSpy содержит опции, переданные компонентом
		const lastCall = flatpickrOptionsSpy.mock.calls[flatpickrOptionsSpy.mock.calls.length - 1][0] as {
			onChange?: (dates: Date[]) => void
			dateFormat?: string
			altFormat?: string
			enableTime?: boolean
		};

		expect(lastCall.dateFormat).toBe('Y');
		expect(lastCall.altFormat).toBe('Y');
		expect(lastCall.enableTime).toBe(false);

		lastCall.onChange?.(selected);

		expect(wrapper.emitted('update:modelValue')).toBeTruthy();
		expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['2024']);
	});

	it('renders custom year grid in year mode and selects year on click', () => {
		mount(AppDatePicker, {
			props: {
				modelValue: '2024',
				mode: 'year',
			},
		});

		const lastCall = flatpickrOptionsSpy.mock.calls[flatpickrOptionsSpy.mock.calls.length - 1][0] as {
			onReady?: (dates: Date[], dateStr: string, instance: any) => void
		};

		expect(typeof lastCall.onReady).toBe('function');

		const instance = {
			setDate: mockSetDate,
			clear: mockClear,
			destroy: mockDestroy,
			calendarContainer: createCalendarContainer(),
			selectedDates: [],
			close: vi.fn(),
		};

		lastCall.onReady?.([], '', instance);

		const grid = instance.calendarContainer.querySelector('.flatpickr-year-grid') as HTMLElement | null;
		expect(grid).not.toBeNull();

		const firstYearButton = grid!.querySelector('.flatpickr-year-grid__item') as HTMLButtonElement | null;
		expect(firstYearButton).not.toBeNull();

		firstYearButton!.click();

		expect(mockSetDate).toHaveBeenCalledWith(expect.any(Date), true);
	});

	it('calls destroy on unmount', () => {
		const wrapper = mount(AppDatePicker, { props: { modelValue: null } });
		wrapper.unmount();
		expect(mockDestroy).toHaveBeenCalled();
	});
});
