import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AppSelect from './AppSelect.vue';

const options = [
	{ value: 'a', label: 'Option A' },
	{ value: 'b', label: 'Option B' },
	{ value: 'c', label: 'Option C' },
];

describe('AppSelect', () => {
	it('renders trigger with placeholder when no value', () => {
		const wrapper = mount(AppSelect, {
			props: { modelValue: undefined, options, placeholder: 'Выберите...' },
		});
		expect(wrapper.find('.app-select__trigger').exists()).toBe(true);
		expect(wrapper.find('.app-select__value--placeholder').text()).toBe('Выберите...');
	});

	it('renders selected option label when modelValue is set', () => {
		const wrapper = mount(AppSelect, {
			props: { modelValue: 'b', options },
		});
		expect(wrapper.find('.app-select__value').text()).toBe('Option B');
	});

	it('emits update:modelValue when option is clicked', async () => {
		const wrapper = mount(AppSelect, {
			props: { modelValue: undefined, options },
		});
		await wrapper.find('.app-select__trigger').trigger('click');
		await wrapper.vm.$nextTick();
		const optionButtons = wrapper.findAll('.app-select__option');
		await optionButtons[1].trigger('click');
		expect(wrapper.emitted('update:modelValue')).toEqual([['b']]);
	});

	it('does not open dropdown when disabled', async () => {
		const wrapper = mount(AppSelect, {
			props: { modelValue: undefined, options, disabled: true },
		});
		await wrapper.find('.app-select__trigger').trigger('click');
		expect(wrapper.find('.app-select__dropdown').isVisible()).toBe(false);
	});

	it('shows search input when searchable', async () => {
		const wrapper = mount(AppSelect, {
			props: { modelValue: undefined, options, searchable: true },
		});
		await wrapper.find('.app-select__trigger').trigger('click');
		await wrapper.vm.$nextTick();
		expect(wrapper.find('.app-select__search-input').exists()).toBe(true);
	});

	it('filters options when searchable and user types', async () => {
		const wrapper = mount(AppSelect, {
			props: { modelValue: undefined, options, searchable: true },
		});
		await wrapper.find('.app-select__trigger').trigger('click');
		await wrapper.vm.$nextTick();
		const searchInput = wrapper.find('.app-select__search-input');
		await searchInput.setValue('B');
		await wrapper.vm.$nextTick();
		const optionButtons = wrapper.findAll('.app-select__option');
		expect(optionButtons).toHaveLength(1);
		expect(optionButtons[0].text()).toBe('Option B');
	});

	it('uses fieldId on trigger for a11y (label for)', () => {
		const wrapper = mount(AppSelect, {
			props: { modelValue: undefined, options, fieldId: 'my-select' },
		});
		expect(wrapper.find('.app-select__trigger').attributes('id')).toBe('my-select');
	});

	it('normalizes options with valueKey and labelKey', () => {
		const entityOptions = [
			{ _id: '1', full_name: 'Alice' },
			{ _id: '2', full_name: 'Bob' },
		];
		const wrapper = mount(AppSelect, {
			props: {
				modelValue: undefined,
				options: entityOptions,
				valueKey: '_id',
				labelKey: 'full_name',
			},
		});
		expect(wrapper.find('.app-select__value--placeholder').text()).toBe('Выберите...');
		wrapper.find('.app-select__trigger').trigger('click');
		return wrapper.vm.$nextTick().then(() => {
			const opts = wrapper.findAll('.app-select__option');
			expect(opts).toHaveLength(2);
			expect(opts[0].text()).toBe('Alice');
			expect(opts[1].text()).toBe('Bob');
		});
	});
});
