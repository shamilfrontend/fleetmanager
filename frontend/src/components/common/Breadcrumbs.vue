<script setup lang="ts">
interface BreadcrumbItem {
	label: string
	to?: string
}

defineProps<{
	items: BreadcrumbItem[]
}>();
</script>

<template>
	<nav class="breadcrumbs" aria-label="Хлебные крошки">
		<ol class="breadcrumbs__list">
			<li v-for="(item, index) in items" :key="index" class="breadcrumbs__item">
				<template v-if="item.to">
					<router-link :to="item.to" class="breadcrumbs__link">{{ item.label }}</router-link>
				</template>
				<span v-else class="breadcrumbs__current" aria-current="page">{{ item.label }}</span>
				<span v-if="index < items.length - 1" class="breadcrumbs__sep">/</span>
			</li>
		</ol>
	</nav>
</template>

<style scoped lang="scss">
@import '@/assets/scss/variables.scss';

.breadcrumbs {
	margin-bottom: $spacing-md;
}

.breadcrumbs__list {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: $spacing-xs;
	list-style: none;
	margin: 0;
	padding: 0;
	font-size: $font-size-sm;
	color: $text-muted;
}

.breadcrumbs__item {
	display: flex;
	align-items: center;
	gap: $spacing-xs;
}

.breadcrumbs__link {
	color: $primary-color;
	text-decoration: none;

	&:hover {
		text-decoration: underline;
	}
}

.breadcrumbs__current {
	color: $text-primary;
	font-weight: $font-weight-medium;
}

.breadcrumbs__sep {
	color: $text-secondary;
	user-select: none;
}
</style>
