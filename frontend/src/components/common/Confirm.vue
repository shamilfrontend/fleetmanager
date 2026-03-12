<script setup lang="ts">
import {
	ref, computed, unref, onMounted, onUnmounted,
} from 'vue';
import AppButton from '@/components/common/AppButton.vue';

interface Props {
	isOpen: boolean
	title?: string
	message?: string
	confirmLabel?: string
	cancelLabel?: string
	variant?: 'danger' | 'primary'
	/** Вызывается при нажатии кнопки подтверждения */
	onConfirm?: () => void | Promise<void>
	/** Вызывается при закрытии (Отмена, крестик, клик по overlay) */
	onClose?: () => void
}

const props = withDefaults(defineProps<Props>(), {
	title: 'Подтверждение',
	message: '',
	confirmLabel: 'Удалить',
	cancelLabel: 'Отмена',
	variant: 'danger',
});

const emit = defineEmits<{
	'update:isOpen': [value: boolean]
}>();

const messageText = computed(() => {
	const m = unref(props.message);
	return typeof m === 'string' ? m : '';
});

const shouldShow = computed(() => {
	const open = unref(props.isOpen);
	return Boolean(open && messageText.value.trim().length > 0);
});

const displayTitle = computed(() => String(unref(props.title) ?? 'Подтверждение'));
const displayConfirmLabel = computed(() => String(unref(props.confirmLabel) ?? 'Удалить'));
const displayCancelLabel = computed(() => String(unref(props.cancelLabel) ?? 'Отмена'));
const displayVariant = computed(() => {
	const v = unref(props.variant);
	return v === 'primary' ? 'primary' : 'danger';
});

const close = () => {
	props.onClose?.();
	emit('update:isOpen', false);
};

const handlingConfirm = ref(false);

const handleConfirm = async () => {
	const fn = props.onConfirm;
	if (!fn) {
		close();
		return;
	}
	handlingConfirm.value = true;
	try {
		await Promise.resolve(fn());
		close();
	} finally {
		handlingConfirm.value = false;
	}
};

const shouldShowRef = computed(() => shouldShow.value);
const onEscape = (e: KeyboardEvent) => {
	if (e.key === 'Escape' && shouldShowRef.value) close();
};

onMounted(() => {
	document.addEventListener('keydown', onEscape);
});
onUnmounted(() => {
	document.removeEventListener('keydown', onEscape);
});
</script>

<template>
	<Teleport to="body">
		<Transition name="fade">
			<div v-if="shouldShow" class="confirm-overlay" @click.self="close">
				<div class="confirm-dialog">
					<div class="confirm-header">
						<h3 class="confirm-title">{{ displayTitle }}</h3>
						<button type="button" class="confirm-close" aria-label="Закрыть" @click="close">×</button>
					</div>
					<div class="confirm-body">
						<p class="confirm-message">{{ messageText }}</p>
					</div>
					<div class="confirm-footer">
						<AppButton variant="secondary" @click="close">
							{{ displayCancelLabel }}
						</AppButton>
						<AppButton
							:variant="displayVariant"
							:disabled="handlingConfirm"
							@click="handleConfirm"
						>
							{{ handlingConfirm ? '...' : displayConfirmLabel }}
						</AppButton>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped lang="scss">
@import '@/assets/scss/variables.scss';

.confirm-overlay {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
	padding: $spacing-lg;
}

.confirm-dialog {
	background: $bg-elevated;
	border-radius: $radius-lg;
	width: 100%;
	max-width: 420px;
	box-shadow: $shadow-modal;
}

.confirm-header {
	padding: $spacing-lg;
	border-bottom: 1px solid $border-medium;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.confirm-title {
	margin: 0;
	font-size: $font-size-lg;
	font-weight: $font-weight-semibold;
	color: $text-primary;
}

.confirm-close {
	background: none;
	border: none;
	font-size: $font-size-xl;
	cursor: pointer;
	color: $text-muted;
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: $radius;
	transition: background-color $transition-fast, color $transition-fast;

	&:hover {
		background-color: $bg-subtle;
		color: $text-primary;
	}
}

.confirm-body {
	padding: $spacing-lg;
}

.confirm-message {
	margin: 0;
	font-size: $font-size-base;
	color: $text-primary;
	line-height: 1.5;
}

.confirm-footer {
	padding: $spacing-lg;
	border-top: 1px solid $border-medium;
	display: flex;
	justify-content: flex-end;
	gap: $spacing-md;
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity $transition-base;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
