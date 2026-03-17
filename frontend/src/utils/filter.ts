export const filterData = <T extends Record<string, unknown>>(
	data: T[],
	searchQuery: string,
	searchFields: (keyof T)[],
): T[] => {
	if (!searchQuery.trim()) {
		return data;
	}

	const query = searchQuery.toLowerCase().trim();

	return data.filter((item) => searchFields.some((field) => {
		const value = item[field];
		if (value === null || value === undefined) {
			return false;
		}
		return String(value).toLowerCase().includes(query);
	}));
};
