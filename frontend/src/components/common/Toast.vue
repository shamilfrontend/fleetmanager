<script setup lang="ts">
import { useToastStore } from '@/stores/toast';

const { toasts, removeToast } = useToastStore();

const getIcon = (type: string) => {
	const icons: Record<string, string> = {
		success: '✓',
		error: '✕',
		warning: '⚠',
		info: 'ℹ',
	};
	return icons[type] || 'ℹ';
};
</script>

<template>
	<Teleport to="body">
		<TransitionGroup name="toast" tag="div" class="toast-container">
			<div
				v-for="toast in toasts"
				:key="toast.id"
				class="toast"
				:class="`toast--${toast.type}`"
			>
				<span class="toast-icon">{{ getIcon(toast.type) }}</span>
				<span class="toast-message">{{ toast.message }}</span>
				<button class="toast-close" @click="removeToast(toast.id)">×</button>
			</div>
		</TransitionGroup>
	</Teleport>
</template>

<style scoped lang="scss">
@import '@/assets/scss/variables.scss';

$toast-warning: #ed6c02;

.toast-container {
	position: fixed;
	top: $spacing-lg;
	right: $spacing-lg;
	z-index: 10000;
	display: flex;
	flex-direction: column;
	gap: $spacing-sm;
	pointer-events: none;
}

.toast {
	display: flex;
	align-items: center;
	gap: $spacing-sm;
	padding: $spacing-md $spacing-lg;
	background: $bg-elevated;
	border-radius: $radius;
	box-shadow: $shadow-modal;
	min-width: 300px;
	max-width: 500px;
	pointer-events: auto;
	animation: slideIn 0.3s ease-out;
	border: 1px solid $border-light;

	&--success {
		border-left: 4px solid $success;
	}

	&--error {
		border-left: 4px solid $warning;
	}

	&--warning {
		border-left: 4px solid $toast-warning;
	}

	&--info {
		border-left: 4px solid $primary-color;
	}
}

.toast-icon {
	font-size: $font-size-lg;
	font-weight: $font-weight-bold;
}

.toast--success .toast-icon {
	color: $success;
}

.toast--error .toast-icon {
	color: $warning;
}

.toast--warning .toast-icon {
	color: $toast-warning;
}

.toast--info .toast-icon {
	color: $primary-color;
}

.toast-message {
	flex: 1;
	font-size: $font-size-sm;
	color: $text-primary;
}

.toast-close {
	background: none;
	border: none;
	font-size: $font-size-lg;
	cursor: pointer;
	color: $text-muted;
	padding: 0;
	width: 24px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: $radius-sm;
	transition: color $transition-fast, background-color $transition-fast;

	&:hover {
		color: $text-primary;
		background: $bg-subtle;
	}
}

.toast-enter-active,
.toast-leave-active {
	transition: all 0.3s ease;
}

.toast-enter-from {
	opacity: 0;
	transform: translateX(100%);
}

.toast-leave-to {
	opacity: 0;
	transform: translateX(100%);
}

@keyframes slideIn {
	from {
		opacity: 0;
		transform: translateX(100%);
	}
	to {
		opacity: 1;
		transform: translateX(0);
	}
}
</style>
