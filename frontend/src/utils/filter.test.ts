import { describe, it, expect } from 'vitest';
import { filterData } from './filter';

describe('filterData', () => {
  it('returns all data when searchQuery is empty', () => {
    const data = [{ name: 'A' }, { name: 'B' }];
    expect(filterData(data, '  ', ['name'])).toEqual(data);
  });

  it('filters by single field', () => {
    const data = [
      { name: 'Иван' },
      { name: 'Петр' },
      { name: 'Мария' },
    ];
    expect(filterData(data, 'иван', ['name'])).toEqual([{ name: 'Иван' }]);
  });

  it('filters by multiple fields', () => {
    const data = [
      { full_name: 'Иван', department: 'Логистика' },
      { full_name: 'Петр', department: 'Транспорт' },
    ];
    expect(filterData(data, 'транспорт', ['full_name', 'department'])).toHaveLength(1);
    expect(filterData(data, 'транспорт', ['full_name', 'department'])[0].department).toBe('Транспорт');
  });

  it('returns empty array when no match', () => {
    const data = [{ name: 'A' }];
    expect(filterData(data, 'xyz', ['name'])).toEqual([]);
  });
});
