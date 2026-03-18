import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addToast, removeToast, useToastStore } from './toast';

describe('toast store', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		const { toasts } = useToastStore();
		toasts.value = [];
	});

	it('addToast adds message to list', () => {
		addToast('Test message', 'success');
		const { toasts } = useToastStore();
		expect(toasts.value).toHaveLength(1);
		expect(toasts.value[0].message).toBe('Test message');
		expect(toasts.value[0].type).toBe('success');
	});

	it('removeToast removes message by id', () => {
		addToast('One', 'info');
		const { toasts } = useToastStore();
		const id = toasts.value[0].id;
		removeToast(id);
		expect(toasts.value).toHaveLength(0);
	});

	it('useToastStore returns toasts and methods', () => {
		const store = useToastStore();
		expect(store).toHaveProperty('toasts');
		expect(store).toHaveProperty('addToast');
		expect(store).toHaveProperty('removeToast');
	});
});
