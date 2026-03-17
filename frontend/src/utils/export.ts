/** Получение значения из объекта по ключу (поддержка вложенных полей через точку) */
function getValue(row: Record<string, unknown> | null, key: string): unknown {
	if (row == null) return undefined;
	const parts = key.split('.');
	let v: unknown = row;
	for (const p of parts) {
		v = (v as Record<string, unknown>)?.[p];
	}
	return v;
}

export const exportToCSV = (data: Record<string, unknown>[], filename: string, columns: Array<{ key: string; label: string }>) => {
	if (!data || data.length === 0) {
		return;
	}

	const headers = columns.map((col) => col.label).join(',');
	const rows = data.map((row) => columns.map((col) => {
		const value = getValue(row, col.key);
		if (value == null) return '';
		const stringValue = String(value).replace(/"/g, '""');
		return `"${stringValue}"`;
	}).join(','));

	// Объединяем
	const csvContent = [headers, ...rows].join('\n');

	// Создаем BOM для правильной кодировки в Excel
	const BOM = '\uFEFF';
	const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

	// Скачиваем
	const link = document.createElement('a');
	const url = URL.createObjectURL(blob);
	link.setAttribute('href', url);
	link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
	link.style.visibility = 'hidden';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
};

export const exportToExcel = async (
	data: Record<string, unknown>[],
	filename: string,
	columns: Array<{ key: string; label: string }>,
): Promise<void> => {
	if (!data || data.length === 0) return;
	const XLSX = await import('xlsx');
	const rows = data.map((row) => {
		const obj: Record<string, unknown> = {};
		columns.forEach((col) => {
			obj[col.label] = getValue(row, col.key);
		});
		return obj;
	});
	const ws = XLSX.utils.json_to_sheet(rows);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Данные');
	const name = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
	XLSX.writeFile(wb, name);
};

export const exportToJSON = (data: unknown, filename: string) => {
	if (!data) {
		return;
	}

	const jsonContent = JSON.stringify(data, null, 2);
	const blob = new Blob([jsonContent], { type: 'application/json' });

	const link = document.createElement('a');
	const url = URL.createObjectURL(blob);
	link.setAttribute('href', url);
	link.setAttribute('download', filename);
	link.style.visibility = 'hidden';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
};
