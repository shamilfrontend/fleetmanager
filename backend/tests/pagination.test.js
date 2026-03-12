import {describe, it, expect} from 'vitest'

import {getPaginationParams} from '../src/utils/pagination.js'

describe('getPaginationParams', () => {
    it('returns defaults when query is empty', () => {
        const result = getPaginationParams({})
        expect(result.page).toBe(1)
        expect(result.limit).toBe(1000)
        expect(result.skip).toBe(0)
    })

    it('parses valid page and limit', () => {
        const result = getPaginationParams({page: '2', limit: '50'})
        expect(result.page).toBe(2)
        expect(result.limit).toBe(50)
        expect(result.skip).toBe(50)
    })

    it('clamps limit to MAX_LIMIT', () => {
        const result = getPaginationParams({page: '1', limit: '20000'})
        expect(result.limit).toBe(10000)
    })
})
