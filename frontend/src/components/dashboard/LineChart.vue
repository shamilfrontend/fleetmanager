<script setup lang="ts">
import {
	ref, onMounted, watch, onBeforeUnmount,
} from 'vue';
import {
	Chart,
	LineController,
	LineElement,
	PointElement,
	LinearScale,
	CategoryScale,
	Tooltip,
	Legend,
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

interface Props {
	data: {
		labels: string[]
		datasets: Array<{
			label: string
			data: number[]
			borderColor?: string
			backgroundColor?: string
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
			type: 'line',
			data: props.data,
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						position: 'top',
					},
					title: props.title ? {
						display: true,
						text: props.title,
					} : undefined,
				},
				scales: {
					y: {
						beginAtZero: true,
					},
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
