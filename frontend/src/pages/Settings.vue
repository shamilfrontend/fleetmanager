<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/utils/toast';
import { getApiErrorMessage } from '@/utils/apiError';
import AppButton from '@/components/common/AppButton.vue';
import Confirm from '@/components/common/Confirm.vue';
import FormField from '@/components/common/FormField.vue';
import AppSelect from '@/components/common/AppSelect.vue';
import { useConfirm } from '@/composables/useConfirm';
import { authApi } from '@/api/auth';
import { carsApi } from '@/api/cars';
import { employeesApi } from '@/api/employees';
import { cardsApi } from '@/api/cards';
import { transactionsApi } from '@/api/transactions';
import { exportToJSON } from '@/utils/export';

const authStore = useAuthStore();

const roleLabels: Record<string, string> = {
	admin: 'Администратор',
	manager: 'Менеджер',
	driver: 'Водитель',
};

const roleOptions = [
	{ value: 'driver', label: 'Водитель' },
	{ value: 'manager', label: 'Менеджер' },
	{ value: 'admin', label: 'Администратор' },
];

const roleLabel = computed(() => roleLabels[authStore.user?.role || ''] || '');

const users = ref<{ _id: string; email: string; role: string }[]>([]);
const usersLoading = ref(false);
const updatingRoleId = ref<string | null>(null);
const confirm = useConfirm();

const handleRoleChange = async (userId: string, role: string) => {
	updatingRoleId.value = userId;
	try {
		await authApi.updateUserRole(userId, role);
		toast.success('Роль обновлена');
		loadUsers();
		if (userId === authStore.user?._id) {
			authStore.setUser({ ...authStore.user!, role });
		}
	} catch (error: unknown) {
		toast.error(getApiErrorMessage(error));
	} finally {
		updatingRoleId.value = null;
	}
};

const openDeleteUserConfirm = (u: { _id: string; email: string }) => {
	confirm.openConfirm(`Удалить пользователя ${u.email}?`, {
		onConfirm: async () => {
			try {
				await authApi.deleteUser(u._id);
				toast.success('Пользователь удалён');
				loadUsers();
			} catch (error: unknown) {
				toast.error(getApiErrorMessage(error));
			}
		},
	});
};

const loadUsers = async () => {
	if (!authStore.isAdmin) return;
	usersLoading.value = true;
	try {
		users.value = await authApi.getUsers();
	} catch {
		users.value = [];
	} finally {
		usersLoading.value = false;
	}
};

onMounted(() => {
	if (authStore.isAdmin) loadUsers();
});

const passwordForm = ref({
	currentPassword: '',
	newPassword: '',
	confirmPassword: '',
});

const changingPassword = ref(false);

const createUserForm = ref({
	email: '',
	password: '',
	role: 'driver',
});
const creatingUser = ref(false);

const handleCreateUser = async () => {
	if (createUserForm.value.password.length < 6) {
		toast.error('Пароль должен быть не менее 6 символов');
		return;
	}
	creatingUser.value = true;
	try {
		await authApi.createUser({
			email: createUserForm.value.email,
			password: createUserForm.value.password,
			role: createUserForm.value.role,
		});
		toast.success('Пользователь создан');
		createUserForm.value = { email: '', password: '', role: 'driver' };
		loadUsers();
	} catch (error: unknown) {
		toast.error(getApiErrorMessage(error));
	} finally {
		creatingUser.value = false;
	}
};

const handleChangePassword = async () => {
	if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
		toast.error('Пароли не совпадают');
		return;
	}

	if (passwordForm.value.newPassword.length < 6) {
		toast.error('Пароль должен содержать не менее 6 символов');
		return;
	}

	changingPassword.value = true;
	try {
		await authApi.changePassword(
			passwordForm.value.currentPassword,
			passwordForm.value.newPassword,
		);
		toast.success('Пароль успешно изменен');
		passwordForm.value = {
			currentPassword: '',
			newPassword: '',
			confirmPassword: '',
		};
	} catch (error: unknown) {
		toast.error(getApiErrorMessage(error));
	} finally {
		changingPassword.value = false;
	}
};

const exportData = async () => {
	try {
		toast.info('Экспорт данных...');

		// Загружаем все данные
		const [cars, employees, cards, transactions] = await Promise.all([
			carsApi.getAll(),
			employeesApi.getAll(),
			cardsApi.getAll(),
			transactionsApi.getAll(),
		]);

		// Создаем объект со всеми данными
		const allData = {
			cars,
			employees,
			cards,
			transactions,
			exportedAt: new Date().toISOString(),
			exportedBy: authStore.user?.email,
		};

		// Экспортируем в JSON
		exportToJSON(allData, `fleetmanager-export-${new Date().toISOString().split('T')[0]}.json`);

		toast.success('Данные успешно экспортированы');
	} catch (error: unknown) {
		console.error('Ошибка экспорта данных:', error);
		toast.error(getApiErrorMessage(error));
	}
};

const clearCache = () => {
	localStorage.removeItem('cache');
	toast.success('Кэш очищен');
};
</script>

<template>
	<div class="settings-page">
		<h1>Настройки</h1>

		<div class="settings-grid">
			<div class="settings-section card">
				<h2>Профиль</h2>
				<div class="profile-info">
					<div class="info-item">
						<span class="info-label">Email:</span>
						<span class="info-value">{{ authStore.user?.email }}</span>
					</div>
					<div class="info-item">
						<span class="info-label">Роль:</span>
						<span class="info-value">{{ roleLabel }}</span>
					</div>
				</div>
			</div>

			<div class="settings-section card">
				<h2>Смена пароля</h2>
				<form @submit.prevent="handleChangePassword" class="password-form">
					<FormField label="Текущий пароль" required field-id="settings-current-password">
						<input
							id="settings-current-password"
							v-model="passwordForm.currentPassword"
							type="password"
							required
							class="form-input"
						/>
					</FormField>
					<FormField label="Новый пароль" required field-id="settings-new-password">
						<input
							id="settings-new-password"
							v-model="passwordForm.newPassword"
							type="password"
							required
							minlength="6"
							class="form-input"
						/>
					</FormField>
					<FormField label="Подтвердите новый пароль" required field-id="settings-confirm-password">
						<input
							id="settings-confirm-password"
							v-model="passwordForm.confirmPassword"
							type="password"
							required
							class="form-input"
						/>
					</FormField>
					<AppButton type="submit" variant="primary" :disabled="changingPassword">
						{{ changingPassword ? 'Сохранение...' : 'Изменить пароль' }}
					</AppButton>
				</form>
			</div>

			<div class="settings-section card">
				<h2>Системная информация</h2>
				<div class="system-info">
					<div class="info-item">
						<span class="info-label">Версия приложения:</span>
						<span class="info-value">1.0.0</span>
					</div>
					<div class="info-item">
						<span class="info-label">Дата последнего обновления:</span>
						<span class="info-value">{{ new Date().toLocaleDateString('ru-RU') }}</span>
					</div>
				</div>
			</div>

			<div v-if="authStore.isAdmin" class="settings-section card admin-section">
				<h2>Административные функции</h2>
				<div class="admin-create-user">
					<h3>Создать пользователя</h3>
					<form @submit.prevent="handleCreateUser" class="create-user-form create-user-form--row">
						<FormField label="Email" required field-id="settings-create-email">
							<input
								id="settings-create-email"
								v-model="createUserForm.email"
								type="email"
								required
								placeholder="email@example.com"
								class="form-input"
							/>
						</FormField>
						<FormField label="Пароль" required field-id="settings-create-password">
							<input
								id="settings-create-password"
								v-model="createUserForm.password"
								type="password"
								required
								minlength="6"
								placeholder="Не менее 6 символов"
								class="form-input"
							/>
						</FormField>
						<FormField label="Роль" required field-id="settings-create-role">
							<AppSelect
								field-id="settings-create-role"
								v-model="createUserForm.role"
								:options="roleOptions"
								placeholder="Выберите роль"
							/>
						</FormField>
						<AppButton type="submit" variant="primary" class="create-user-form__submit" :disabled="creatingUser">
							{{ creatingUser ? 'Создание...' : 'Создать' }}
						</AppButton>
					</form>
				</div>
				<div class="admin-users-list">
					<h3>Пользователи системы</h3>
					<div v-if="usersLoading" class="users-loading">Загрузка...</div>
					<table v-else-if="users.length > 0" class="users-table">
						<thead>
							<tr>
								<th>Email</th>
								<th>Роль</th>
								<th>Действия</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="u in users" :key="u._id">
								<td>{{ u.email }}</td>
								<td>
									<AppSelect
										:model-value="u.role"
										:options="roleOptions"
										placeholder="Роль"
										:disabled="updatingRoleId === u._id"
										@update:model-value="(role) => handleRoleChange(u._id, role)"
									/>
								</td>
								<td>
									<AppButton
										size="sm"
										variant="danger"
										:disabled="u._id === authStore.user?._id"
										:title="u._id === authStore.user?._id ? 'Нельзя удалить себя' : 'Удалить'"
										@click="openDeleteUserConfirm(u)"
									>
										Удалить
									</AppButton>
								</td>
							</tr>
						</tbody>
					</table>
					<p v-else class="users-empty">Нет пользователей</p>
				</div>
				<div class="admin-actions">
					<AppButton variant="primary" @click="exportData">
						Экспорт данных
					</AppButton>
					<AppButton variant="secondary" @click="clearCache">
						Очистить кэш
					</AppButton>
				</div>
			</div>
		</div>

		<Confirm
			v-model:is-open="confirm.isOpen"
			:title="confirm.title"
			:message="confirm.message"
			:confirm-label="confirm.confirmLabel"
			:cancel-label="confirm.cancelLabel"
			:variant="confirm.variant"
			:on-confirm="confirm.handleConfirm"
			:on-close="confirm.closeConfirm"
		/>
	</div>
</template>

<style scoped lang="scss">
.settings-page {
	h1 {
		margin-bottom: $spacing-lg;
	}
}

.settings-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
	gap: $spacing-lg;
}

.settings-section.admin-section {
	grid-column: 1 / -1;
}

.settings-section {
	padding: $spacing-lg;

	h2 {
		font-size: $font-size-lg;
		font-weight: 600;
		margin-bottom: $spacing-md;
		color: $text-primary;
	}
}

.profile-info,
.system-info {
	display: flex;
	flex-direction: column;
	gap: $spacing-md;
}

.info-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: $spacing-sm 0;
	border-bottom: 1px solid #f0f0f0;

	&:last-child {
		border-bottom: none;
	}
}

.info-label {
	font-weight: 500;
	color: #666;
}

.info-value {
	color: $text-primary;
	font-weight: 500;
}

.password-form {
	display: flex;
	flex-direction: column;
	gap: $spacing-md;
}

.form-group {
	display: flex;
	flex-direction: column;
	gap: $spacing-xs;
}

label {
	font-weight: 500;
	color: $text-primary;
}

.form-input {
	padding: $spacing-sm $spacing-md;
	border: 1px solid #e0e0e0;
	border-radius: $border-radius;
	font-size: $font-size-base;
	font-family: $font-primary;

	&:focus {
		outline: none;
		border-color: $primary-color;
	}
}

.admin-users-list {
	margin-bottom: $spacing-lg;

	h3 {
		font-size: $font-size-base;
		font-weight: 600;
		margin-bottom: $spacing-md;
		color: $text-primary;
	}
}

.users-loading {
	color: #666;
	font-size: $font-size-sm;
}

.users-table {
	width: 100%;
	border-collapse: collapse;
	font-size: $font-size-sm;

	th,
	td {
		padding: $spacing-sm $spacing-md;
		text-align: left;
		border-bottom: 1px solid #eee;
	}

	th {
		font-weight: 600;
		color: #666;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.form-input--inline {
		min-width: 140px;
		padding: $spacing-xs $spacing-sm;
		font-size: $font-size-sm;
	}
}

.users-empty {
	color: #666;
	font-size: $font-size-sm;
	margin: 0;
}

.admin-create-user {
	margin-bottom: $spacing-lg;

	h3 {
		font-size: $font-size-base;
		font-weight: 600;
		margin-bottom: $spacing-md;
		color: $text-primary;
	}
}

.create-user-form {
	display: flex;
	flex-direction: column;
	gap: $spacing-md;
	margin-bottom: $spacing-lg;

	&--row {
		flex-direction: row;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: $spacing-md;
		margin-bottom: $spacing-lg;

		.form-group {
			flex: 1;
			min-width: 140px;
		}

		.create-user-form__submit {
			flex-shrink: 0;
		}
	}
}

.admin-actions {
	display: flex;
	flex-direction: column;
	gap: $spacing-md;
}
</style>
