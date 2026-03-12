<script setup lang="ts">
import { useRouter } from 'vue-router';
import AppButton from '@/components/common/AppButton.vue';

const router = useRouter();
</script>

<template>
	<div class="not-found-page">
		<div class="not-found-card card">
			<h1 class="not-found-code">404</h1>
			<p class="not-found-title">Страница не найдена</p>
			<p class="not-found-text">Запрашиваемая страница не существует или была перемещена.</p>
			<AppButton variant="primary" class="not-found-btn" @click="router.push('/')">На главную</AppButton>
		</div>
	</div>
</template>

<style scoped lang="scss">
.not-found-page {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 60vh;
	padding: $spacing-lg;
}

.not-found-card {
	text-align: center;
	padding: $spacing-xl;
	max-width: 400px;
}

.not-found-code {
	font-size: 4rem;
	font-weight: 700;
	color: $primary-color;
	margin: 0 0 $spacing-sm;
	line-height: 1;
}

.not-found-title {
	font-size: $font-size-xl;
	font-weight: 600;
	color: $text-primary;
	margin: 0 0 $spacing-sm;
}

.not-found-text {
	color: #666;
	margin: 0 0 $spacing-lg;
	font-size: $font-size-base;
}

.not-found-btn {
	margin-top: $spacing-md;
}
</style>
