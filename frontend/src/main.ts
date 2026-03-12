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

authStore.initAuth().then(() => {
	setApiErrorHandlers({
		onUnauthorized: async () => {
			await authStore.logout();
			router.push('/login');
		},
		onError: (message) => toast.error(message),
	});
	app.mount('#app');
});
