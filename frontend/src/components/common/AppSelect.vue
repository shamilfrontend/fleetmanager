<script setup lang="ts">
import {
	ref, computed, watch, nextTick, onMounted, onBeforeUnmount,
} from 'vue';

export interface SelectOption {
	value: string | number | undefined
	label: string
}

export interface LoadOptionsParams {
	page: number
	limit: number
	search?: string
}

export interface LoadOptionsResult {
	options: SelectOption[]
	total: number
}

interface Props {
	modelValue?: string | number
	options?: SelectOption[] | Record<string, unknown>[]
	placeholder?: string
	disabled?: boolean
	clearable?: boolean
	searchable?: boolean
	fieldId?: string
	valueKey?: string
	labelKey?: string
	loadOptions?: (params: LoadOptionsParams) => Promise<LoadOptionsResult>
}

const PAGE_SIZE = 20;
const SCROLL_LOAD_THRESHOLD = 100;
const SEARCH_DEBOUNCE_MS = 300;

const props = withDefaults(defineProps<Props>(), {
	options: () => [],
	placeholder: 'Выберите...',
	disabled: false,
	clearable: false,
	searchable: false,
	valueKey: 'value',
	labelKey: 'label',
});

const emit = defineEmits<{
	'update:modelValue': [value: string | number | undefined]
}>();

const isAsync = computed(() => typeof props.loadOptions === 'function');

const isOpen = ref(false);
const searchQuery = ref('');
const triggerRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
const listRef = ref<HTMLElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const highlightedIndex = ref(-1);

// Async mode state
const asyncOptions = ref<SelectOption[]>([]);
const asyncPage = ref(1);
const asyncTotal = ref(0);
const loading = ref(false);
const loadingMore = ref(false);
const selectedOptionLabel = ref<string | null>(null);
let searchDebounceId: ReturnType<typeof setTimeout> | null = null;

function normalizeOption(raw: SelectOption | Record<string, unknown>): SelectOption {
	if (raw && typeof raw === 'object' && 'value' in raw && 'label' in raw) {
		return { value: (raw as SelectOption).value, label: String((raw as SelectOption).label) };
	}
	const obj = raw as Record<string, unknown>;
	const value = obj[props.valueKey] as string | number | undefined;
	const label = obj[props.labelKey] != null ? String(obj[props.labelKey]) : String(value ?? '');
	return { value, label };
}

const normalizedOptions = computed<SelectOption[]>(() =>
	(props.options ?? []).map((opt) => normalizeOption(opt)));

const asyncFilteredOptions = computed<SelectOption[]>(() => {
	if (!props.searchable || !searchQuery.value.trim()) return asyncOptions.value;
	const q = searchQuery.value.trim().toLowerCase();
	return asyncOptions.value.filter((opt) => opt.label.toLowerCase().includes(q));
});

const filteredOptions = computed<SelectOption[]>(() => {
	if (isAsync.value) return asyncFilteredOptions.value;
	if (!props.searchable || !searchQuery.value.trim()) return normalizedOptions.value;
	const q = searchQuery.value.trim().toLowerCase();
	return normalizedOptions.value.filter((opt) => opt.label.toLowerCase().includes(q));
});

const selectedOption = computed(() =>
	filteredOptions.value.find((opt) => opt.value === props.modelValue || (opt.value == null && props.modelValue == null)));

const displayText = computed(() => {
	if (props.modelValue !== undefined && props.modelValue !== '' && props.modelValue !== null && selectedOptionLabel.value)
		return selectedOptionLabel.value;
	return selectedOption.value?.label ?? props.placeholder;
});

const hasValue = computed(() =>
	props.modelValue !== undefined && props.modelValue !== '' && props.modelValue !== null);

const hasMore = computed(() => isAsync.value && asyncOptions.value.length < asyncTotal.value);

async function loadFirstPage() {
	if (!props.loadOptions) return;
	loading.value = true;
	asyncOptions.value = [];
	asyncPage.value = 1;
	try {
		const { options, total } = await props.loadOptions({
			page: 1,
			limit: PAGE_SIZE,
			search: searchQuery.value.trim() || undefined,
		});
		asyncOptions.value = options.map((o) => normalizeOption(o));
		asyncTotal.value = total;
	} finally {
		loading.value = false;
	}
}

async function loadNextPage() {
	if (!props.loadOptions || loadingMore.value || !hasMore.value) return;
	loadingMore.value = true;
	const nextPage = asyncPage.value + 1;
	try {
		const { options, total } = await props.loadOptions({
			page: nextPage,
			limit: PAGE_SIZE,
			search: searchQuery.value.trim() || undefined,
		});
		asyncTotal.value = total;
		const normalized = options.map((o) => normalizeOption(o));
		asyncOptions.value = [...asyncOptions.value, ...normalized];
		asyncPage.value = nextPage;
	} finally {
		loadingMore.value = false;
	}
}

function onListScroll() {
	const el = listRef.value;
	if (!el || !hasMore.value || loadingMore.value || loading.value) return;
	const { scrollTop, clientHeight, scrollHeight } = el;
	if (scrollTop + clientHeight >= scrollHeight - SCROLL_LOAD_THRESHOLD) {
		loadNextPage();
	}
}

function open() {
	if (props.disabled) return;
	isOpen.value = true;
	searchQuery.value = '';
	highlightedIndex.value = -1;
	if (isAsync.value) {
		nextTick(() => loadFirstPage());
	}
	nextTick(() => {
		if (props.searchable && searchInputRef.value) {
			searchInputRef.value.focus();
		}
		if (!isAsync.value) alignHighlight();
	});
}

function close() {
	isOpen.value = false;
	searchQuery.value = '';
	highlightedIndex.value = -1;
}

function select(opt: SelectOption) {
	if (isAsync.value) selectedOptionLabel.value = opt.label;
	emit('update:modelValue', opt.value);
	close();
}

function clear(e: Event) {
	e.stopPropagation();
	if (isAsync.value) selectedOptionLabel.value = null;
	emit('update:modelValue', undefined);
}

function onTriggerKeydown(e: KeyboardEvent) {
	if (props.disabled) return;
	if (e.key === 'Enter' || e.key === ' ') {
		e.preventDefault();
		if (isOpen.value) {
			if (highlightedIndex.value >= 0 && filteredOptions.value[highlightedIndex.value]) {
				select(filteredOptions.value[highlightedIndex.value]);
			}
		} else {
			open();
		}
		return;
	}
	if (e.key === 'Escape') {
		e.preventDefault();
		close();
		return;
	}
	if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
		e.preventDefault();
		if (!isOpen.value) {
			open();
			return;
		}
		const len = filteredOptions.value.length;
		if (len === 0) return;
		if (e.key === 'ArrowDown') {
			highlightedIndex.value = highlightedIndex.value < len - 1 ? highlightedIndex.value + 1 : 0;
		} else {
			highlightedIndex.value = highlightedIndex.value <= 0 ? len - 1 : highlightedIndex.value - 1;
		}
		nextTick(() => scrollHighlightIntoView());
	}
}

function onDropdownKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape') {
		e.preventDefault();
		close();
		triggerRef.value?.focus();
		return;
	}
	if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
		e.preventDefault();
		const len = filteredOptions.value.length;
		if (len === 0) return;
		if (e.key === 'ArrowDown') {
			highlightedIndex.value = highlightedIndex.value < len - 1 ? highlightedIndex.value + 1 : 0;
		} else {
			highlightedIndex.value = highlightedIndex.value <= 0 ? len - 1 : highlightedIndex.value - 1;
		}
		scrollHighlightIntoView();
		return;
	}
	if (e.key === 'Enter' && highlightedIndex.value >= 0 && filteredOptions.value[highlightedIndex.value]) {
		e.preventDefault();
		select(filteredOptions.value[highlightedIndex.value]);
	}
}

function alignHighlight() {
	if (props.modelValue == null || props.modelValue === '') {
		highlightedIndex.value = 0;
		return;
	}
	const idx = filteredOptions.value.findIndex(
		(opt) => opt.value === props.modelValue || (opt.value == null && props.modelValue == null),
	);
	highlightedIndex.value = idx >= 0 ? idx : 0;
}

function scrollHighlightIntoView() {
	nextTick(() => {
		const list = dropdownRef.value?.querySelector('.app-select__list');
		const el = list?.children[highlightedIndex.value] as HTMLElement | undefined;
		if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	});
}

function handleClickOutside(event: MouseEvent) {
	const target = event.target as Node;
	if (
		triggerRef.value?.contains(target) ||
		dropdownRef.value?.contains(target)
	) return;
	close();
}

watch(isOpen, (open) => {
	if (open) {
		if (!isAsync.value) alignHighlight();
		document.addEventListener('mousedown', handleClickOutside);
	} else {
		document.removeEventListener('mousedown', handleClickOutside);
	}
});

watch(selectedOption, (opt) => {
	if (isAsync.value && opt && props.modelValue != null) selectedOptionLabel.value = opt.label;
});

watch(
	() => props.modelValue,
	(v) => {
		if (v === undefined || v === '' || v === null) selectedOptionLabel.value = null;
	},
);

// Async: debounced search
watch(searchQuery, () => {
	if (!isAsync.value || !props.loadOptions) return;
	if (searchDebounceId) clearTimeout(searchDebounceId);
	searchDebounceId = setTimeout(() => {
		searchDebounceId = null;
		if (isOpen.value) loadFirstPage();
	}, SEARCH_DEBOUNCE_MS);
});

// Async: align highlight after first page loaded
watch([loading, () => asyncOptions.value.length], () => {
	if (isAsync.value && !loading.value && isOpen.value) nextTick(() => alignHighlight());
});

onMounted(() => {
	if (isOpen.value) document.addEventListener('mousedown', handleClickOutside);
});

onBeforeUnmount(() => {
	document.removeEventListener('mousedown', handleClickOutside);
	if (searchDebounceId) clearTimeout(searchDebounceId);
});
</script>

<template>
	<div
		class="app-select"
		:class="{ 'app-select--open': isOpen, 'app-select--disabled': disabled }"
		role="combobox"
		:aria-expanded="isOpen"
		aria-haspopup="listbox"
		:aria-disabled="disabled"
	>
		<button
			:id="fieldId"
			ref="triggerRef"
			type="button"
			class="app-select__trigger"
			:disabled="disabled"
			:aria-label="displayText"
			@click="open"
			@keydown="onTriggerKeydown"
		>
			<span class="app-select__value" :class="{ 'app-select__value--placeholder': !hasValue }">
				{{ displayText }}
			</span>
			<span class="app-select__icons">
				<button
					v-if="clearable && hasValue"
					type="button"
					class="app-select__clear"
					aria-label="Очистить"
					@click="clear"
				>
					×
				</button>
				<span class="app-select__chevron" aria-hidden="true">▼</span>
			</span>
		</button>
		<Transition name="app-select-dropdown">
			<div
				v-show="isOpen"
				ref="dropdownRef"
				class="app-select__dropdown"
				tabindex="-1"
				@keydown="onDropdownKeydown"
			>
				<div v-if="searchable" class="app-select__search">
					<input
						ref="searchInputRef"
						v-model="searchQuery"
						type="text"
						class="app-select__search-input"
						placeholder="Поиск..."
						@keydown.enter.prevent="
							if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
								select(filteredOptions[highlightedIndex]);
							}
						"
						@keydown.down.prevent="onDropdownKeydown($event)"
						@keydown.up.prevent="onDropdownKeydown($event)"
						@keydown.escape="close(); triggerRef?.focus()"
					/>
				</div>
				<div
					ref="listRef"
					class="app-select__list"
					role="listbox"
					@scroll="onListScroll"
				>
					<div v-if="loading && asyncOptions.length === 0" class="app-select__empty">
						Загрузка...
					</div>
					<template v-else>
						<button
							v-for="(opt, index) in filteredOptions"
							:key="String(opt.value)"
							type="button"
							class="app-select__option"
							:class="{
								'app-select__option--selected': opt.value === modelValue || (opt.value == null && modelValue == null),
								'app-select__option--highlighted': index === highlightedIndex,
							}"
							role="option"
							:aria-selected="opt.value === modelValue || (opt.value == null && modelValue == null)"
							@click="select(opt)"
							@mouseenter="highlightedIndex = index"
						>
							{{ opt.label }}
						</button>
						<div v-if="loadingMore" class="app-select__loading-more">
							Загрузка...
						</div>
						<div v-if="!loading && filteredOptions.length === 0" class="app-select__empty">
							Нет вариантов
						</div>
					</template>
				</div>
			</div>
		</Transition>
	</div>
</template>

<style scoped lang="scss">
.app-select {
	position: relative;
	width: 100%;
}

.app-select__trigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	min-height: 42px;
	padding: 10px $spacing-md;
	border: 1px solid $border-medium;
	border-radius: $radius-sm;
	font-size: $font-size-base;
	font-family: $font-primary;
	color: $text-primary;
	background: $bg-elevated;
	text-align: left;
	cursor: pointer;
	transition: border-color $transition-fast, box-shadow $transition-fast;

	&:hover:not(:disabled) {
		border-color: darken($border-medium, 8%);
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

.app-select--open .app-select__trigger {
	border-color: $border-focus;
	box-shadow: 0 0 0 3px rgba($primary-color, 0.15);
}

.app-select__value {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.app-select__value--placeholder {
	color: $text-muted;
}

.app-select__icons {
	display: flex;
	align-items: center;
	gap: $spacing-xs;
	margin-left: $spacing-sm;
	flex-shrink: 0;
}

.app-select__clear {
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

.app-select__chevron {
	font-size: 10px;
	color: $text-muted;
	pointer-events: none;
}

.app-select__dropdown {
	position: absolute;
	z-index: 1000;
	top: calc(100% + 4px);
	left: 0;
	right: 0;
	max-height: 280px;
	overflow: hidden;
	background: $bg-elevated;
	border: 1px solid $border-medium;
	border-radius: $radius-sm;
	box-shadow: $shadow-md;
	display: flex;
	flex-direction: column;
}

.app-select__search {
	padding: $spacing-sm;
	border-bottom: 1px solid $border-light;
	flex-shrink: 0;
}

.app-select__search-input {
	width: 100%;
	padding: $spacing-sm $spacing-md;
	border: 1px solid $border-medium;
	border-radius: $radius-sm;
	font-size: $font-size-sm;
	font-family: $font-primary;
	color: $text-primary;
	background: $bg-elevated;

	&:focus {
		outline: none;
		border-color: $border-focus;
	}
}

.app-select__list {
	overflow-y: auto;
	max-height: 240px;
	padding: $spacing-xs;
}

.app-select__option {
	display: block;
	width: 100%;
	padding: $spacing-sm $spacing-md;
	border: none;
	border-radius: $radius-sm;
	font-size: $font-size-base;
	font-family: $font-primary;
	color: $text-primary;
	text-align: left;
	background: transparent;
	cursor: pointer;
	transition: background $transition-fast;

	&:hover,
	&.app-select__option--highlighted {
		background: $bg-subtle;
	}

	&.app-select__option--selected {
		background: $primary-light;
		color: $primary-dark;
	}
}

.app-select__empty,
.app-select__loading-more {
	padding: $spacing-md;
	font-size: $font-size-sm;
	color: $text-muted;
	text-align: center;
}

.app-select-dropdown-enter-active,
.app-select-dropdown-leave-active {
	transition: opacity $transition-fast ease, transform $transition-fast ease;
}

.app-select-dropdown-enter-from,
.app-select-dropdown-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}
</style>
