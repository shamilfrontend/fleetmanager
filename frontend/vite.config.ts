import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
	if (mode === 'production' && !process.env.VITE_API_URL?.trim()) {
		throw new Error(
			'Для production-сборки задайте VITE_API_URL (например: VITE_API_URL=https://api.example.com/api yarn build)',
		);
	}
	return {
		plugins: [vue()],
		resolve: {
			alias: {
				'@': fileURLToPath(new URL('./src', import.meta.url)),
			},
		},
		css: {
			preprocessorOptions: {
				scss: {
					additionalData: '@import "@/assets/scss/variables.scss";',
				},
			},
		},
		server: {
			port: 3000,
			proxy: {
				'/api': {
					target: 'http://localhost:5002',
					changeOrigin: true,
				},
			},
		},
	};
});
