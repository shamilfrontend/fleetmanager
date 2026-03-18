import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/utils/toast';
import { getApiErrorMessage } from '@/utils/apiError';

declare module 'vue-router' {
	interface RouteMeta {
		requiresAuth?: boolean
		roles?: ('admin' | 'manager' | 'driver')[]
	}
}

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/login',
			name: 'Login',
			component: () => import('@/layouts/AuthLayout.vue'),
			children: [
				{
					path: '',
					component: () => import('@/pages/Login.vue'),
				},
			],
		},
		{
			path: '/register',
			name: 'Register',
			component: () => import('@/layouts/AuthLayout.vue'),
			children: [
				{
					path: '',
					component: () => import('@/pages/Register.vue'),
				},
			],
		},
		{
			path: '/',
			component: () => import('@/layouts/DefaultLayout.vue'),
			meta: { requiresAuth: true },
			children: [
				{
					path: '',
					name: 'Dashboard',
					component: () => import('@/pages/Dashboard.vue'),
				},
				{
					path: 'cars',
					name: 'Cars',
					component: () => import('@/pages/Cars.vue'),
				},
				{
					path: 'cars/:id(\\d+|[a-fA-F0-9]{24})',
					name: 'CarDetail',
					component: () => import('@/pages/CarDetail.vue'),
				},
				{
					path: 'employees',
					name: 'Employees',
					component: () => import('@/pages/Employees.vue'),
				},
				{
					path: 'employees/:id(\\d+|[a-fA-F0-9]{24})',
					name: 'EmployeeDetail',
					component: () => import('@/pages/EmployeeDetail.vue'),
				},
				{
					path: 'cards',
					name: 'Cards',
					component: () => import('@/pages/Cards.vue'),
				},
				{
					path: 'cards/:id(\\d+|[a-fA-F0-9]{24})',
					name: 'CardDetail',
					component: () => import('@/pages/CardDetail.vue'),
				},
				{
					path: 'transactions',
					name: 'Transactions',
					component: () => import('@/pages/Transactions.vue'),
				},
				{
					path: 'analytics',
					name: 'Analytics',
					component: () => import('@/pages/Analytics.vue'),
					meta: { roles: ['admin', 'manager'] },
				},
				{
					path: 'settings',
					name: 'Settings',
					component: () => import('@/pages/Settings.vue'),
				},
				{
					path: 'link-builder',
					name: 'LinkBuilder',
					component: () => import('@/pages/LinkBuilder.vue'),
					meta: { roles: ['admin', 'manager'] },
				},
				{
					path: '/:pathMatch(.*)*',
					name: 'NotFound',
					component: () => import('@/pages/NotFound.vue'),
				},
			],
		},
	],
});

router.beforeEach(async (to, _from, next) => {
	const authStore = useAuthStore();

	// Если есть токен, но нет пользователя, пытаемся восстановить сессию
	if (authStore.token && !authStore.user) {
		try {
			await authStore.initAuth();
		} catch (error) {
			console.error('Ошибка восстановления сессии:', error);
			toast.error(getApiErrorMessage(error));
			await authStore.logout();
			if (to.path !== '/login' && to.path !== '/register') {
				next('/login');
				return;
			}
		}
	}

	if (to.meta.requiresAuth && !authStore.isAuthenticated) {
		next('/login');
		return;
	}
	if ((to.path === '/login' || to.path === '/register') && authStore.isAuthenticated) {
		next('/');
		return;
	}

	const roles = to.meta.roles as ('admin' | 'manager' | 'driver')[] | undefined;
	if (roles && roles.length > 0 && authStore.user?.role) {
		const { role } = authStore.user;
		const allowed = roles.includes(role) || (role === 'admin' && roles.includes('manager'));
		if (!allowed) {
			toast.error('Доступ запрещён');
			next('/');
			return;
		}
	}

	next();
});

export default router;
