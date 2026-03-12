const DEFAULT_LIMIT = 1000
const MAX_LIMIT = 10000

export interface PaginationParams {
  page: number
  limit: number
  skip: number
}

export interface PaginationQuery {
  page?: string
  limit?: string
}

/**
 * Парсит query-параметры page и limit для пагинации.
 */
export function getPaginationParams(query: PaginationQuery): PaginationParams {
  const page = Math.max(1, parseInt(query.page ?? '', 10) || 1)
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(query.limit ?? '', 10) || DEFAULT_LIMIT)
  )
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

/**
 * Формирует ответ со списком и метаданными пагинации.
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  return { data, total, page, limit }
}
