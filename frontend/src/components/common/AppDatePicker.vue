<script setup lang="ts">
import {
	ref, watch, onMounted, onBeforeUnmount, computed,
} from 'vue';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

interface FlatpickrInstance {
	setDate: (date: Date | string | number | null, triggerChange?: boolean) => void
	clear: () => void
	destroy: () => void
	calendarContainer?: HTMLElement
	selectedDates?: Date[]
	close?: () => void
}

interface Props {
	modelValue?: string | Date | null
	placeholder?: string
	disabled?: boolean
	clearable?: boolean
	fieldId?: string
	/** Формат отображения в инпуте (Flatpickr altFormat), например d.m.Y */
	format?: string
	/** Формат значения (emit), по умолчанию Y-m-d */
	dateFormat?: string
	minDate?: string | Date
	maxDate?: string | Date
	enableTime?: boolean
	/** Режим выбора: дата (по умолчанию) или только год */
	mode?: 'date' | 'year'
}

const props = withDefaults(defineProps<Props>(), {
	modelValue: null,
	placeholder: 'Выберите дату',
	disabled: false,
	clearable: false,
	format: 'd.m.Y',
	dateFormat: 'Y-m-d',
	minDate: undefined,
	maxDate: undefined,
	enableTime: false,
	mode: 'date',
});

const emit = defineEmits<{
	'update:modelValue': [value: string | null]
}>();

const inputRef = ref<HTMLInputElement | null>(null);
let fpInstance: FlatpickrInstance | null = null;

interface YearGridApi {
	updateFromValue: (value: string | Date | null | undefined) => void
}

let yearGridApi: YearGridApi | null = null;

const hasValue = computed(() =>
	props.modelValue !== undefined && props.modelValue !== null && props.modelValue !== '');

function toDate(val: string | Date | null | undefined): Date | undefined {
	if (val === null || val === undefined || val === '') return undefined;
	if (val instanceof Date) return val;
	// строка только с годом, например "2024"
	if (typeof val === 'string' && /^\d{4}$/.test(val)) {
		const yearNum = Number(val);
		if (Number.isNaN(yearNum)) return undefined;
		return new Date(yearNum, 0, 1);
	}
	const d = new Date(val);
	return Number.isNaN(d.getTime()) ? undefined : d;
}

function buildOptions(): flatpickr.Options.Options {
	const isYearMode = props.mode === 'year';

	const opts: flatpickr.Options.Options = {
		dateFormat: isYearMode ? 'Y' : props.dateFormat,
		altInput: true,
		altFormat: isYearMode ? 'Y' : props.format,
		altInputClass: 'app-date-picker__input flatpickr-alt',
		allowInput: false,
		minDate: toDate(props.minDate),
		maxDate: toDate(props.maxDate),
		enableTime: isYearMode ? false : props.enableTime,
		disableMobile: true,
		defaultDate: toDate(props.modelValue) ?? undefined,
		onChange(selectedDates) {
			const str = selectedDates[0] ? formatForEmit(selectedDates[0]) : null;
			emit('update:modelValue', str);
		},
	};

	if (isYearMode) {
		opts.onReady = (selectedDates, _dateStr, instance) => {
			setupYearMode(instance as FlatpickrInstance, selectedDates[0]);
		};
	}

	return opts;
}

function decadeStart(year: number): number {
	return Math.floor(year / 10) * 10;
}

function setupYearMode(instance: FlatpickrInstance, initialDate?: Date) {
	if (!instance || !instance.calendarContainer) return;

	const calendar = instance.calendarContainer;
	const daysContainer = calendar.querySelector<HTMLElement>('.flatpickr-days');
	if (daysContainer) {
		daysContainer.style.display = 'none';
	}

	const selected = initialDate || instance.selectedDates?.[0] || toDate(props.modelValue) || undefined;
	const todayYear = new Date().getFullYear();
	let currentYear = selected?.getFullYear() ?? todayYear;
	let currentDecadeStart = decadeStart(currentYear);

	const existingWrapper = calendar.querySelector<HTMLElement>('.flatpickr-year-grid-wrapper');
	if (existingWrapper) {
		existingWrapper.remove();
	}

	const wrapper = document.createElement('div');
	wrapper.className = 'flatpickr-year-grid-wrapper';

	const header = document.createElement('div');
	header.className = 'flatpickr-year-grid__header';

	const prevBtn = document.createElement('button');
	prevBtn.type = 'button';
	prevBtn.className = 'flatpickr-year-grid__nav flatpickr-year-grid__nav--prev';
	prevBtn.textContent = '«';

	const title = document.createElement('div');
	title.className = 'flatpickr-year-grid__title';

	const nextBtn = document.createElement('button');
	nextBtn.type = 'button';
	nextBtn.className = 'flatpickr-year-grid__nav flatpickr-year-grid__nav--next';
	nextBtn.textContent = '»';

	header.appendChild(prevBtn);
	header.appendChild(title);
	header.appendChild(nextBtn);

	const grid = document.createElement('div');
	grid.className = 'flatpickr-year-grid';
	grid.setAttribute('role', 'grid');

	wrapper.appendChild(header);
	wrapper.appendChild(grid);
	calendar.appendChild(wrapper);

	function renderGrid(selectedYear?: number) {
		grid.innerHTML = '';
		const startYear = currentDecadeStart;
		title.textContent = `${startYear} - ${startYear + 8}`;

		for (let i = 0; i < 9; i += 1) {
			const year = startYear + i;
			const cell = document.createElement('button');
			cell.type = 'button';
			cell.className = 'flatpickr-year-grid__item';
			cell.textContent = String(year);
			cell.dataset.year = String(year);
			cell.setAttribute('role', 'gridcell');
			if (selectedYear && year === selectedYear) {
				cell.classList.add('flatpickr-year-grid__item--selected');
				cell.setAttribute('aria-selected', 'true');
			}
			cell.addEventListener('click', () => {
				const y = Number(cell.dataset.year);
				if (Number.isNaN(y)) return;
				const date = new Date(y, 0, 1);
				instance.setDate(date, true);
				if (typeof instance.close === 'function') {
					instance.close();
				}
			});
			grid.appendChild(cell);
		}
	}

	prevBtn.addEventListener('click', () => {
		currentDecadeStart -= 10;
		renderGrid(selected?.getFullYear());
	});

	nextBtn.addEventListener('click', () => {
		currentDecadeStart += 10;
		renderGrid(selected?.getFullYear());
	});

	renderGrid(selected?.getFullYear());

	yearGridApi = {
		updateFromValue(value) {
			const date = toDate(value);
			if (!date) {
				currentYear = todayYear;
			} else {
				currentYear = date.getFullYear();
			}
			currentDecadeStart = decadeStart(currentYear);
			renderGrid(date?.getFullYear());
		},
	};
}

function formatForEmit(d: Date): string {
	if (props.mode === 'year') {
		return d.getFullYear().toString();
	}

	if (props.enableTime) {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		const h = String(d.getHours()).padStart(2, '0');
		const min = String(d.getMinutes()).padStart(2, '0');
		return `${y}-${m}-${day}T${h}:${min}`;
	}
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function clear(e: Event) {
	e.stopPropagation();
	if (fpInstance) {
		fpInstance.clear();
		emit('update:modelValue', null);
	}
}

onMounted(() => {
	if (!inputRef.value) return;
	const instance = flatpickr(inputRef.value, buildOptions());
	fpInstance = (Array.isArray(instance) ? instance[0] : instance) as FlatpickrInstance;
	const initial = toDate(props.modelValue);
	if (initial && fpInstance) fpInstance.setDate(initial, false);
});

watch(
	() => props.modelValue,
	(val) => {
		if (!fpInstance) return;
		const d = toDate(val);
		if (d) {
			fpInstance.setDate(d, false);
		} else {
			fpInstance.clear();
		}

		if (props.mode === 'year' && yearGridApi) {
			yearGridApi.updateFromValue(val);
		}
	},
);

onBeforeUnmount(() => {
	if (fpInstance) {
		fpInstance.destroy();
		fpInstance = null;
	}
});
</script>

<template>
	<div
		class="app-date-picker"
		:class="{ 'app-date-picker--disabled': disabled }"
	>
		<div class="app-date-picker__wrap">
			<input
				:id="fieldId"
				ref="inputRef"
				type="text"
				class="app-date-picker__input"
				:placeholder="placeholder"
				:disabled="disabled"
				:aria-label="placeholder"
				autocomplete="off"
				data-input
			/>
			<button
				v-if="clearable && hasValue"
				type="button"
				class="app-date-picker__clear"
				aria-label="Очистить"
				@click="clear"
			>
				×
			</button>
		</div>
	</div>
</template>

<style scoped lang="scss">
@import '@/assets/scss/variables.scss';

.app-date-picker {
	position: relative;
	width: 100%;
}

.app-date-picker__wrap {
	display: flex;
	align-items: center;
	position: relative;
	width: 100%;
}

.app-date-picker__input {
	flex: 1;
	width: 100%;
	min-height: 42px;
	padding: 10px $spacing-md;
	padding-right: 36px;
	border: 1px solid $border-medium;
	border-radius: $radius-sm;
	font-size: $font-size-base;
	font-family: $font-primary;
	color: $text-primary;
	background: $bg-elevated;
	transition: border-color $transition-fast, box-shadow $transition-fast;

	&::placeholder {
		color: $text-muted;
	}

	&:focus {
		outline: none;
		border-color: $border-focus;
		box-shadow: 0 0 0 3px rgba($primary-color, 0.15);
	}

	&:disabled {
		background: $bg-subtle;
		cursor: not-allowed;
		opacity: 0.8;
	}
}

.app-date-picker__clear {
	position: absolute;
	right: $spacing-sm;
	top: 50%;
	transform: translateY(-50%);
	display: flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	padding: 0;
	border: none;
	border-radius: 50%;
	font-size: 18px;
	line-height: 1;
	color: $text-muted;
	background: transparent;
	cursor: pointer;
	transition: color $transition-fast, background $transition-fast;

	&:hover {
		color: $text-primary;
		background: $bg-subtle;
	}
}

.app-date-picker--disabled .app-date-picker__clear {
	display: none;
}
</style>

<style lang="scss">
@import '@/assets/scss/variables.scss';

.flatpickr-year-grid-wrapper {
	padding: $spacing-md;
	background: $bg-elevated;
	color: $text-primary;
}

.flatpickr-year-grid__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: $spacing-sm;
	font-size: $font-size-sm;
}

.flatpickr-year-grid__title {
	font-weight: 500;
	color: $text-secondary;
}

.flatpickr-year-grid__nav {
	border: none;
	background: transparent;
	color: $text-secondary;
	cursor: pointer;
	padding: 4px 8px;
	border-radius: $radius-sm;
	transition: background $transition-fast, color $transition-fast;

	&:hover {
		background: $primary-light;
		color: $text-primary;
	}
}

.flatpickr-year-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: $spacing-xs;
}

.flatpickr-year-grid__item {
	border: none;
	background: transparent;
	color: $text-primary;
	border-radius: $radius-sm;
	padding: 8px 0;
	text-align: center;
	cursor: pointer;
	font-size: $font-size-base;
	transition: background $transition-fast, color $transition-fast, transform $transition-fast;

	&:hover {
		background: $primary-light;
		transform: translateY(-1px);
	}
}

.flatpickr-year-grid__item--selected {
	background: $primary-color;
	color: #fff;
}

/* Светлая тема календаря flatpickr */
.flatpickr-calendar {
	background: $bg-elevated;
	border: 1px solid $border-light;
	box-shadow: $shadow-md;
	color: $text-primary;

	&.open {
		z-index: 1001;
	}
}

.flatpickr-months {
	border-bottom: 1px solid $border-light;
}

.flatpickr-months .flatpickr-month {
	background: $bg-elevated;
	color: $text-primary;
}

.flatpickr-current-month input.cur-year,
.flatpickr-current-month .flatpickr-monthDropdown-months {
	color: $text-primary;
}

.flatpickr-weekdays {
	background: $bg-elevated;
	border-bottom: 1px solid $border-light;
}

span.flatpickr-weekday {
	color: $text-secondary;
	font-weight: $font-weight-medium;
}

.flatpickr-day {
	color: $text-primary;

	&.today {
		border-color: $primary-color;
	}

	&:hover {
		background: $primary-light !important;
		border-color: $primary-light !important;
	}

	&.selected,
	&.startRange,
	&.endRange {
		background: $primary-color !important;
		border-color: $primary-color !important;
		color: #fff;
	}
}

.flatpickr-time {
	border-top: 1px solid $border-light;
}

.flatpickr-time input {
	border-radius: $radius-sm;

	&:focus {
		border-color: $border-focus;
		background: $primary-light;
	}
}
</style>
