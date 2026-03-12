import { getCurrentInstance } from 'vue';

export const useToast = () => {
	const instance = getCurrentInstance();
	const toast = instance?.appContext.config.globalProperties.$toast;

	return {
		success: (message: string) => toast?.addToast(message, 'success'),
		error: (message: string) => toast?.addToast(message, 'error'),
		warning: (message: string) => toast?.addToast(message, 'warning'),
		info: (message: string) => toast?.addToast(message, 'info'),
	};
};
