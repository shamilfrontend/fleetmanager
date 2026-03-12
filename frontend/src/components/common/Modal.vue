<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import AppButton from '@/components/common/AppButton.vue';

interface Props {
	isOpen: boolean
	title: string
	showFooter?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	showFooter: true,
});

const emit = defineEmits<{
	'update:isOpen': [value: boolean]
	confirm: []
}>();

const close = () => {
	emit('update:isOpen', false);
};

const handleConfirm = () => {
	emit('confirm');
};

const onEscape = (e: KeyboardEvent) => {
	if (e.key === 'Escape' && props.isOpen) close();
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
		<Transition name="modal">
			<div v-if="isOpen" class="modal-overlay" @click.self="close">
				<div class="modal-content">
					<div class="modal-header">
						<h3 class="modal-title">{{ title }}</h3>
						<button type="button" class="modal-close" aria-label="Закрыть" @click="close">×</button>
					</div>
					<div class="modal-body">
						<slot />
					</div>
					<div v-if="showFooter" class="modal-footer">
						<slot name="footer">
							<AppButton variant="primary" @click="handleConfirm">Подтвердить</AppButton>
							<AppButton variant="secondary" @click="close">Отмена</AppButton>
						</slot>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped lang="scss">
@import '@/assets/scss/variables.scss';

.modal-overlay {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
	padding: $spacing-lg;
}

.modal-content {
	background: $bg-elevated;
	border-radius: $radius-lg;
	width: 100%;
	max-width: 600px;
	max-height: 90vh;
	display: flex;
	flex-direction: column;
	box-shadow: $shadow-modal;
}

.modal-header {
	padding: $spacing-lg;
	border-bottom: 1px solid $border-medium;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.modal-title {
	font-size: $font-size-lg;
	font-weight: $font-weight-semibold;
	color: $text-primary;
}

.modal-close {
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

.modal-body {
	padding: $spacing-lg;
	overflow-y: auto;
	flex: 1;
}

.modal-footer {
	padding: $spacing-lg;
	border-top: 1px solid $border-medium;
	display: flex;
	justify-content: flex-end;
	gap: $spacing-md;
}

.modal-enter-active,
.modal-leave-active {
	transition: opacity $transition-base;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
	transition: transform $transition-base;
}

.modal-enter-from,
.modal-leave-to {
	opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
	transform: scale(0.96);
}
</style>
