<script setup lang="ts">
import { computed } from 'vue';

interface Props {
	label?: string
	error?: string
	required?: boolean
	/** Id для связи label с полем ввода и aria-describedby (доступность) */
	fieldId?: string
}

const props = withDefaults(defineProps<Props>(), {
	required: false,
});

/** Id элемента с текстом ошибки для aria-describedby на input (при fieldId и error). */
const errorDescriptionId = computed(() => (props.fieldId && props.error ? `${props.fieldId}-error` : undefined));
</script>

<template>
	<div class="form-group">
		<label v-if="label" :for="fieldId || undefined">{{ label }}<span v-if="required" class="required">*</span></label>
		<slot />
		<span v-if="error" :id="errorDescriptionId ?? undefined" class="error-message" role="alert">{{ error }}</span>
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
