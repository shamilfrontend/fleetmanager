<script setup lang="ts">
import {
	ref, onMounted, watch, onBeforeUnmount,
} from 'vue';
import {
	Chart,
	DoughnutController,
	ArcElement,
	Tooltip,
	Legend,
} from 'chart.js';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

interface Props {
	data: {
		labels: string[]
		datasets: Array<{
			label: string
			data: number[]
			backgroundColor?: string | string[]
			borderColor?: string | string[]
		}>
	}
	title?: string
}

const props = defineProps<Props>();
const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

onMounted(() => {
	if (chartCanvas.value) {
		chartInstance = new Chart(chartCanvas.value, {
			type: 'doughnut',
			data: props.data,
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						position: 'right',
					},
					title: props.title ? {
						display: true,
						text: props.title,
					} : undefined,
				},
			},
		});
	}
});

watch(() => props.data, (newData) => {
	if (chartInstance) {
		chartInstance.data = newData;
		chartInstance.update();
	}
}, { deep: true });

onBeforeUnmount(() => {
	if (chartInstance) {
		chartInstance.destroy();
	}
});
</script>

<template>
	<div class="chart-container">
		<canvas ref="chartCanvas"></canvas>
	</div>
</template>

<style scoped lang="scss">
.chart-container {
	position: relative;
	height: 300px;
	width: 100%;
}
</style>
