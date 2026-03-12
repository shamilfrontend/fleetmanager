<script setup lang="ts">
import { computed, useSlots } from 'vue';

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'dark';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type ButtonType = 'button' | 'submit' | 'reset';

const props = withDefaults(
	defineProps<{
		variant?: Variant
		outline?: boolean
		rounded?: boolean
		size?: Size
		block?: boolean
		disabled?: boolean
		type?: ButtonType
	}>(),
	{
		variant: 'primary',
		outline: false,
		rounded: false,
		size: 'md',
		block: false,
		disabled: false,
		type: 'button',
	},
);

const slots = useSlots();

const buttonClasses = computed(() => [
	'app-btn',
	`app-btn--${props.variant}`,
	props.outline ? 'app-btn--outline' : '',
	props.rounded ? 'app-btn--rounded' : '',
	`app-btn--${props.size}`,
	props.block ? 'app-btn--block' : '',
]);
</script>

<template>
	<button
		:class="buttonClasses"
		:type="props.type"
		:disabled="props.disabled"
	>
		<span v-if="slots.left" class="app-btn__left">
			<slot name="left" />
		</span>
		<slot />
		<span v-if="slots.right" class="app-btn__right">
			<slot name="right" />
		</span>
	</button>
</template>

<style scoped lang="scss">
@import '@/assets/scss/variables.scss';

.app-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: $spacing-sm;
	border: 1px solid transparent;
	border-radius: $radius;
	font-family: $font-primary;
	font-weight: $font-weight-medium;
	cursor: pointer;
	transition: background-color $transition-fast, color $transition-fast, border-color $transition-fast,
		box-shadow $transition-fast, opacity $transition-fast;

	&--rounded {
		border-radius: 999px;
	}

	&--xs {
		padding: $spacing-xs $spacing-sm;
		font-size: $font-size-xs;
	}

	&--sm {
		padding: $spacing-sm $spacing-md;
		font-size: $font-size-sm;
	}

	&--md {
		padding: $spacing-sm $spacing-lg;
		font-size: $font-size-sm;
	}

	&--lg {
		padding: $spacing-md $spacing-xl;
		font-size: $font-size-base;
	}

	&--xl {
		padding: $spacing-md $spacing-2xl;
		font-size: $font-size-lg;
	}

	&--block {
		width: 100%;
	}

	&:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	// Filled variants
	&--primary {
		background-color: $primary-color;
		color: white;
		&:hover:not(:disabled) {
			background-color: $primary-hover;
		}
		&:active:not(:disabled) {
			background-color: $primary-dark;
		}
	}

	&--secondary {
		background-color: $bg-subtle;
		color: $text-primary;
		border-color: $border-medium;
		&:hover:not(:disabled) {
			background-color: darken($bg-subtle, 3%);
			border-color: darken($border-medium, 5%);
		}
	}

	&--success {
		background-color: $success;
		color: white;
		&:hover:not(:disabled) {
			background-color: darken($success, 5%);
		}
	}

	&--danger {
		background-color: $danger;
		color: white;
		&:hover:not(:disabled) {
			background-color: darken($danger, 5%);
		}
	}

	&--warning {
		background-color: $warning-orange;
		color: white;
		&:hover:not(:disabled) {
			background-color: $warning-orange-hover;
		}
	}

	&--info {
		background-color: $info;
		color: white;
		&:hover:not(:disabled) {
			background-color: $info-hover;
		}
	}

	&--dark {
		background-color: $dark-btn;
		color: white;
		&:hover:not(:disabled) {
			background-color: $dark-btn-hover;
		}
	}

	// Outline variants
	&.app-btn--outline {
		&.app-btn--primary {
			background-color: transparent;
			color: $primary-color;
			border-color: $primary-color;
			&:hover:not(:disabled) {
				background-color: rgba($primary-color, 0.08);
			}
		}
		&.app-btn--secondary {
			background-color: transparent;
			color: $text-primary;
			border-color: $border-medium;
			&:hover:not(:disabled) {
				background-color: $bg-subtle;
			}
		}
		&.app-btn--success {
			background-color: transparent;
			color: $success;
			border-color: $success;
			&:hover:not(:disabled) {
				background-color: $success-light;
			}
		}
		&.app-btn--danger {
			background-color: transparent;
			color: $danger;
			border-color: $danger;
			&:hover:not(:disabled) {
				background-color: $warning-light;
			}
		}
		&.app-btn--warning {
			background-color: transparent;
			color: $warning-orange;
			border-color: $warning-orange;
			&:hover:not(:disabled) {
				background-color: rgba($warning-orange, 0.1);
			}
		}
		&.app-btn--info {
			background-color: transparent;
			color: $info;
			border-color: $info;
			&:hover:not(:disabled) {
				background-color: rgba($info, 0.1);
			}
		}
		&.app-btn--dark {
			background-color: transparent;
			color: $dark-btn;
			border-color: $dark-btn;
			&:hover:not(:disabled) {
				background-color: rgba($dark-btn, 0.1);
			}
		}
	}
}

.app-btn__left,
.app-btn__right {
	display: inline-flex;
	align-items: center;
}
</style>
