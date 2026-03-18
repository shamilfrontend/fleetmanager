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
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');
const validationErrors = ref<Record<string, string>>({});

const REGISTER_RULES: Record<string, ValidationRule> = {
	email: { required: true, label: 'Email' },
	password: { required: true, minLength: 6, label: 'Пароль' },
	confirmPassword: {
		required: true,
		custom: (v, ctx) => (v === ctx?.password ? true : 'Пароли не совпадают'),
		label: 'Подтверждение пароля',
	},
};

const handleRegister = async () => {
	const data = {
		email: email.value,
		password: password.value,
		confirmPassword: confirmPassword.value,
	};
	const errors = validateForm(data, REGISTER_RULES);
	validationErrors.value = errors;
	if (Object.keys(errors).length > 0) {
		error.value = Object.values(errors)[0] ?? '';
		return;
	}

	loading.value = true;
	error.value = '';
	validationErrors.value = {};
	try {
		await authStore.register(email.value, password.value, 'driver');
		toast.success('Регистрация успешна');
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
	<div class="register-page">
		<div class="register-card card">
			<h1 class="register-title">FleetManager</h1>
			<p class="register-subtitle">Регистрация</p>
			<form @submit.prevent="handleRegister" class="register-form">
				<FormField label="Email" :error="validationErrors.email" required field-id="register-email">
					<input
						id="register-email"
						v-model="email"
						type="email"
						required
						placeholder="Введите email"
						class="form-input"
						:aria-describedby="validationErrors.email ? 'register-email-error' : undefined"
					/>
				</FormField>
				<FormField label="Пароль" :error="validationErrors.password" required field-id="register-password">
					<input
						id="register-password"
						v-model="password"
						type="password"
						required
						minlength="6"
						placeholder="Не менее 6 символов"
						class="form-input"
						:aria-describedby="validationErrors.password ? 'register-password-error' : undefined"
					/>
				</FormField>
				<FormField label="Подтвердите пароль" :error="validationErrors.confirmPassword" required field-id="register-confirm-password">
					<input
						id="register-confirm-password"
						v-model="confirmPassword"
						type="password"
						required
						placeholder="Повторите пароль"
						class="form-input"
						:aria-describedby="validationErrors.confirmPassword ? 'register-confirm-password-error' : undefined"
					/>
				</FormField>
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
