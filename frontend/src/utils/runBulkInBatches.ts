/**
 * Выполняет асинхронные операции над массивом элементов батчами (параллельно внутри батча).
 * @param items — массив элементов
 * @param batchSize — размер батча (например, 8)
 * @param fn — функция для каждого элемента, возвращает Promise
 * @param onProgress — опциональный callback (выполнено, всего) после каждого батча
 * @returns массив результатов в порядке items
 */
export async function runBulkInBatches<T, R>(
	items: T[],
	batchSize: number,
	fn: (item: T, index: number) => Promise<R>,
	onProgress?: (done: number, total: number) => void,
): Promise<R[]> {
	const total = items.length;
	const results: R[] = [];
	let done = 0;

	for (let i = 0; i < items.length; i += batchSize) {
		const batch = items.slice(i, i + batchSize);
		const batchResults = await Promise.all(
			batch.map((item, j) => fn(item, i + j)),
		);
		results.push(...batchResults);
		done += batch.length;
		onProgress?.(done, total);
	}

	return results;
}
