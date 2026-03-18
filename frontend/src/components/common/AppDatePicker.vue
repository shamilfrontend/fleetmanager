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
}

const props = withDefaults(defineProps<Props>(), {
	modelValue: null,
	placeholder: 'Выберите дату',
	disabled: false,
	clearable: false,
	format: 'd.m.Y',
	dateFormat: 'Y-m-d',
	enableTime: false,
});

const emit = defineEmits<{
	'update:modelValue': [value: string | null]
}>();

const inputRef = ref<HTMLInputElement | null>(null);
let fpInstance: FlatpickrInstance | null = null;

const hasValue = computed(() =>
	props.modelValue !== undefined && props.modelValue !== null && props.modelValue !== '');

function toDate(val: string | Date | null | undefined): Date | undefined {
	if (val === null || val === undefined || val === '') return undefined;
	if (val instanceof Date) return val;
	const d = new Date(val);
	return Number.isNaN(d.getTime()) ? undefined : d;
}

function buildOptions(): flatpickr.Options.Options {
	const opts: flatpickr.Options.Options = {
		dateFormat: props.dateFormat,
		altInput: true,
		altFormat: props.format,
		altInputClass: 'app-date-picker__input flatpickr-alt',
		allowInput: false,
		minDate: toDate(props.minDate),
		maxDate: toDate(props.maxDate),
		enableTime: props.enableTime,
		defaultDate: toDate(props.modelValue) ?? undefined,
		onChange(selectedDates) {
			const str = selectedDates[0] ? formatForEmit(selectedDates[0]) : null;
			emit('update:modelValue', str);
		},
	};
	return opts;
}

function formatForEmit(d: Date): string {
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

/* Flatpickr calendar theme — Petrolplus palette */
.flatpickr-calendar {
	&.open {
		z-index: 1001;
	}
}

.flatpickr-day.selected,
.flatpickr-day.startRange,
.flatpickr-day.endRange {
	background: $primary-color !important;
	border-color: $primary-color !important;
}

.flatpickr-day:hover {
	background: $primary-light !important;
	border-color: $primary-light !important;
}

.flatpickr-day.today {
	border-color: $primary-color;
}

.flatpickr-months .flatpickr-month {
	background: $primary-color;
}

.flatpickr-current-month .flatpickr-monthDropdown-months:hover,
span.flatpickr-weekday {
	color: $text-secondary;
}

.flatpickr-weekdays {
	background: $primary-color;
}

.flatpickr-time input:focus {
	border-color: $border-focus;
}

.flatpickr-time .flatpickr-time-input:focus {
	background: $primary-light;
}
</style>
