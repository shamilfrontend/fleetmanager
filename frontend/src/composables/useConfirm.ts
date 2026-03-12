import { ref, computed } from 'vue';

export interface ConfirmOptions {
	title?: string
	confirmLabel?: string
	cancelLabel?: string
	variant?: 'danger' | 'primary'
	onConfirm: () => void | Promise<void>
}

export function useConfirm() {
	const isOpen = ref(false);
	const message = ref('');
	const title = ref('Подтверждение');
	const confirmLabel = ref('Удалить');
	const cancelLabel = ref('Отмена');
	const variant = ref<'danger' | 'primary'>('danger');
	let onConfirmCallback: (() => void | Promise<void>) | null = null;

	const isOpenModel = computed({
		get: () => isOpen.value,
		set: (v: boolean) => {
			isOpen.value = v;
			if (!v) onConfirmCallback = null;
		},
	});

	function openConfirm(msg: string, options?: ConfirmOptions) {
		message.value = msg;
		title.value = options?.title ?? 'Подтверждение';
		confirmLabel.value = options?.confirmLabel ?? 'Удалить';
		cancelLabel.value = options?.cancelLabel ?? 'Отмена';
		variant.value = options?.variant ?? 'danger';
		onConfirmCallback = options?.onConfirm ?? null;
		isOpen.value = true;
	}

	async function handleConfirm() {
		try {
			if (onConfirmCallback) {
				await Promise.resolve(onConfirmCallback());
			}
		} finally {
			onConfirmCallback = null;
			isOpen.value = false;
		}
	}

	function closeConfirm() {
		isOpen.value = false;
		onConfirmCallback = null;
	}

	return {
		isOpen: isOpenModel,
		message,
		title,
		confirmLabel,
		cancelLabel,
		variant,
		openConfirm,
		handleConfirm,
		closeConfirm,
	};
}
