<script setup lang="ts">
// Auth layout for login/register pages
</script>

<template>
	<div class="auth-layout">
		<div class="auth-container">
			<router-view />
		</div>
	</div>
</template>

<style scoped lang="scss">
@import '@/assets/scss/variables.scss';

.auth-layout {
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(160deg, $primary-color 0%, $primary-dark 50%, darken($primary-dark, 4%) 100%);
}

.auth-container {
	width: 100%;
	max-width: 420px;
	padding: $spacing-lg;
}
</style>
