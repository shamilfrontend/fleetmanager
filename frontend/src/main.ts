import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import { setApiErrorHandlers } from './api/axios';
import { toast } from './utils/toast';
import './assets/scss/main.scss';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

const authStore = useAuthStore();

function mountApp(): void {
	setApiErrorHandlers({
		onUnauthorized: async () => {
			await authStore.logout();
			void router.push('/login');
		},
		onError: (message) => toast.error(message),
	});
	app.mount('#app');
}

authStore.initAuth().then(mountApp).catch(() => {
	// Сеть, неверный refresh token и т.д. — всё равно монтируем приложение;
	// роутер перенаправит неавторизованного пользователя на /login
	mountApp();
});
