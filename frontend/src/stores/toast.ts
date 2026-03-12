import { ref } from 'vue';

export interface ToastMessage {
	id: number
	message: string
	type: 'success' | 'error' | 'warning' | 'info'
}

const toasts = ref<ToastMessage[]>([]);
let toastId = 0;

export const addToast = (message: string, type: ToastMessage['type'] = 'info', duration = 3000) => {
	const id = toastId++;
	toasts.value.push({ id, message, type });

	if (duration > 0) {
		setTimeout(() => {
			removeToast(id);
		}, duration);
	}
};

export const removeToast = (id: number) => {
	const index = toasts.value.findIndex((t) => t.id === id);
	if (index > -1) {
		toasts.value.splice(index, 1);
	}
};

export const useToastStore = () => ({
	toasts,
	addToast,
	removeToast,
});
