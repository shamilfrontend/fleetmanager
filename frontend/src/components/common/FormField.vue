<script setup lang="ts">
interface Props {
	label?: string
	error?: string
	required?: boolean
}

withDefaults(defineProps<Props>(), {
	required: false,
});
</script>

<template>
	<div class="form-group">
		<label v-if="label">{{ label }}<span v-if="required" class="required">*</span></label>
		<slot />
		<span v-if="error" class="error-message">{{ error }}</span>
	</div>
</template>

<style scoped lang="scss">
.form-group {
	display: flex;
	flex-direction: column;
	gap: $spacing-xs;
}

label {
	font-weight: 500;
	color: $text-primary;
}

.required {
	color: $warning;
	margin-left: 2px;
}

.error-message {
	font-size: $font-size-xs;
	color: $warning;
}
</style>
