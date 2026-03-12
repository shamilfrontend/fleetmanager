<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AppButton from '@/components/common/AppButton.vue';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/utils/toast';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');

const handleRegister = async () => {
	if (password.value !== confirmPassword.value) {
		error.value = 'Пароли не совпадают';
		return;
	}
	if (password.value.length < 6) {
		error.value = 'Пароль должен быть не менее 6 символов';
		return;
	}

	loading.value = true;
	error.value = '';
	try {
		await authStore.register(email.value, password.value, 'driver');
		toast.success('Регистрация успешна');
		router.push('/');
	} catch (err: any) {
		const errorMessage = err?.response?.data?.message || 'Ошибка регистрации';
		error.value = errorMessage;
		toast.error(errorMessage);
	} finally {
		loading.value = false;
	}
};
</script>

<template>
	<div class="register-page">
		<div class="register-card card">
			<h1 class="register-title">FleetManager</h1>
			<p class="register-subtitle">Регистрация</p>
			<form @submit.prevent="handleRegister" class="register-form">
				<div class="form-group">
					<label>Email</label>
					<input
						v-model="email"
						type="email"
						required
						placeholder="Введите email"
						class="form-input"
					/>
				</div>
				<div class="form-group">
					<label>Пароль</label>
					<input
						v-model="password"
						type="password"
						required
						minlength="6"
						placeholder="Не менее 6 символов"
						class="form-input"
					/>
				</div>
				<div class="form-group">
					<label>Подтвердите пароль</label>
					<input
						v-model="confirmPassword"
						type="password"
						required
						placeholder="Повторите пароль"
						class="form-input"
					/>
				</div>
				<AppButton type="submit" variant="primary" block :disabled="loading">
					{{ loading ? 'Регистрация...' : 'Зарегистрироваться' }}
				</AppButton>
				<p v-if="error" class="error-message">{{ error }}</p>
				<p class="auth-link">
					Уже есть аккаунт?
					<router-link to="/login">Войти</router-link>
				</p>
			</form>
		</div>
	</div>
</template>

<style scoped lang="scss">
@import '@/assets/scss/variables.scss';

.register-page {
	width: 100%;
}

.register-card {
	padding: $spacing-2xl;
	border-radius: $radius-lg;
	box-shadow: $shadow-modal;
}

.register-title {
	font-size: $font-size-2xl;
	font-weight: $font-weight-bold;
	color: $primary-color;
	text-align: center;
	margin-bottom: $spacing-sm;
	letter-spacing: $letter-spacing-tight;
}

.register-subtitle {
	text-align: center;
	color: $text-muted;
	margin-bottom: $spacing-lg;
	font-size: $font-size-base;
}

.register-form {
	display: flex;
	flex-direction: column;
	gap: $spacing-md;
}

.btn-block {
	width: 100%;
	margin-top: $spacing-sm;
	padding: 10px $spacing-md;
}

.error-message {
	color: $warning;
	text-align: center;
	font-size: $font-size-sm;
}

.auth-link {
	text-align: center;
	font-size: $font-size-sm;
	color: $text-muted;
	margin-top: $spacing-md;

	a {
		color: $primary-color;
		text-decoration: none;
		font-weight: $font-weight-medium;

		&:hover {
			text-decoration: underline;
		}
	}
}
</style>
