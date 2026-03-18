<script setup lang="ts">
interface Props {
	modelValue: string
	placeholder?: string
}

withDefaults(defineProps<Props>(), {
	placeholder: 'Поиск...',
});

defineEmits<{
	'update:modelValue': [value: string]
}>();
</script>

<template>
	<div class="search-input">
		<input
			:value="modelValue"
			@input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
			type="text"
			:placeholder="placeholder"
			class="search-field"
		/>
		<span class="search-icon">🔍</span>
	</div>
</template>

<style scoped lang="scss">
.search-input {
	position: relative;
	display: flex;
	align-items: center;
}

.search-field {
	width: 100%;
	padding: 10px 40px 10px $spacing-md;
	border: 1px solid #e0e0e0;
	border-radius: $border-radius;
	font-size: $font-size-base;
	font-family: $font-primary;

	&:focus {
		outline: none;
		border-color: $primary-color;
	}
}

.search-icon {
	position: absolute;
	right: $spacing-md;
	color: #666;
	pointer-events: none;
}
</style>
