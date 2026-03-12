const DEFAULT_LIMIT = 1000
const MAX_LIMIT = 10000

/**
 * Парсит query-параметры page и limit для пагинации.
 * @param {object} query - req.query
 * @returns {{ page: number, limit: number, skip: number }}
 */
export function getPaginationParams(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT)
  )
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

/**
 * Формирует ответ со списком и метаданными пагинации.
 * @param {Array} data - массив элементов
 * @param {number} total - общее количество
 * @param {number} page - текущая страница
 * @param {number} limit - размер страницы
 */
export function paginatedResponse(data, total, page, limit) {
  return { data, total, page, limit }
}
