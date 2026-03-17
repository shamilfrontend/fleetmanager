import { describe, it, expect, vi, afterEach } from 'vitest';
import axios from 'axios';
import { getApiErrorMessage } from './apiError';

describe('getApiErrorMessage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns message from API error response', () => {
    const err = { response: { data: { message: 'Ошибка валидации' } } };
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    expect(getApiErrorMessage(err)).toBe('Ошибка валидации');
  });

  it('returns default message when response has no message', () => {
    const err = { response: { data: {} } };
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    expect(getApiErrorMessage(err)).toBe('Ошибка запроса');
  });

  it('returns Error message for standard Error', () => {
    expect(getApiErrorMessage(new Error('Something failed'))).toBe('Something failed');
  });

  it('returns default for unknown value', () => {
    expect(getApiErrorMessage(null)).toBe('Ошибка запроса');
  });
});
