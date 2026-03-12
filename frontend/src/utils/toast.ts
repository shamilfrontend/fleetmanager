import { useToastStore } from '@/stores/toast';

export const toast = {
	success: (message: string) => {
		const { addToast } = useToastStore();
		addToast(message, 'success');
	},
	error: (message: string) => {
		const { addToast } = useToastStore();
		addToast(message, 'error');
	},
	warning: (message: string) => {
		const { addToast } = useToastStore();
		addToast(message, 'warning');
	},
	info: (message: string) => {
		const { addToast } = useToastStore();
		addToast(message, 'info');
	},
};
