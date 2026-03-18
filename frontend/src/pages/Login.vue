<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AppButton from '@/components/common/AppButton.vue';
import FormField from '@/components/common/FormField.vue';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/utils/toast';
import { getApiErrorMessage } from '@/utils/apiError';
import { validateForm, type ValidationRule } from '@/utils/validation';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const validationErrors = ref<Record<string, string>>({});

const LOGIN_RULES: Record<string, ValidationRule> = {
	email: { required: true, label: 'Email' },
	password: { required: true, label: 'Пароль' },
};

const handleLogin = async () => {
	const errors = validateForm(
		{ email: email.value, password: password.value },
		LOGIN_RULES,
	);
	validationErrors.value = errors;
	if (Object.keys(errors).length > 0) {
		error.value = Object.values(errors)[0] ?? '';
		return;
	}
	loading.value = true;
	error.value = '';
	validationErrors.value = {};
	try {
		await authStore.login(email.value, password.value);
		toast.success('Вход выполнен успешно');
		router.push('/');
	} catch (err: unknown) {
		const errorMessage = getApiErrorMessage(err);
		error.value = errorMessage;
		validationErrors.value = { email: errorMessage };
		toast.error(errorMessage);
	} finally {
		loading.value = false;
	}
};
</script>

<template>
	<div class="login-page">
		<div class="login-card card">
			<h1 class="login-title">FleetManager</h1>
			<p class="login-subtitle">Вход в систему</p>
			<form @submit.prevent="handleLogin" class="login-form">
				<FormField label="Email" :error="validationErrors.email" required field-id="login-email">
					<input
						id="login-email"
						v-model="email"
						type="email"
						required
						placeholder="Введите email"
						class="form-input"
						:aria-describedby="validationErrors.email ? 'login-email-error' : undefined"
					/>
				</FormField>
				<FormField label="Пароль" :error="validationErrors.password" required field-id="login-password">
					<input
						id="login-password"
						v-model="password"
						type="password"
						required
						placeholder="Введите пароль"
						class="form-input"
						:aria-describedby="validationErrors.password ? 'login-password-error' : undefined"
					/>
				</FormField>
				<AppButton type="submit" variant="primary" block :disabled="loading">
					{{ loading ? 'Вход...' : 'Войти' }}
				</AppButton>
				<p v-if="error" class="error-message">{{ error }}</p>
				<p class="auth-link">
					Нет аккаунта?
					<router-link to="/register">Зарегистрироваться</router-link>
				</p>
			</form>
		</div>
	</div>
</template>

<style scoped lang="scss">
@import '@/assets/scss/variables.scss';

.login-page {
	width: 100%;
}

.login-card {
	padding: $spacing-2xl;
	border-radius: $radius-lg;
	box-shadow: $shadow-modal;
}

.login-title {
	font-size: $font-size-2xl;
	font-weight: $font-weight-bold;
	color: $primary-color;
	text-align: center;
	margin-bottom: $spacing-sm;
	letter-spacing: $letter-spacing-tight;
}

.login-subtitle {
	text-align: center;
	color: $text-muted;
	margin-bottom: $spacing-lg;
	font-size: $font-size-base;
}

.login-form {
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
