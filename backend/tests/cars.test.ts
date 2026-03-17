import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockJson = vi.fn()
const mockStatus = vi.fn(() => ({ json: mockJson }))
const createMockRes = () => ({ status: mockStatus, json: mockJson })

const mockCar = {
  _id: '507f1f77bcf86cd799439012',
  brand: 'Toyota',
  model: 'Camry',
  plate_number: 'А123BC',
  vin: 'WVWZZZ3CZWE123456',
  year: 2022,
  equipment: [],
  status: 'active',
  mileage: 0,
  save: vi.fn()
}

vi.mock('../src/models/Car.js', () => ({
  default: vi.fn()
}))

const Car = (await import('../src/models/Car.js')).default
const { getAllCars, getCarById, createCar } = await import('../src/controllers/carController.js')

describe('carController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStatus.mockReturnValue({ json: mockJson })
    Car.find = vi.fn().mockReturnValue({
      populate: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockCar])
          })
        })
      })
    })
    Car.countDocuments = vi.fn().mockResolvedValue(1)
    Car.findById = vi.fn().mockReturnValue({
      populate: vi.fn().mockResolvedValue(mockCar)
    })
  })

  describe('getAllCars', () => {
    it('returns paginated list of cars', async () => {
      const req = { query: {}, user: { role: 'admin' } } as any
      const res = createMockRes() as any

      await getAllCars(req, res)

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [mockCar],
          total: 1,
          page: 1,
          limit: 1000
        })
      )
    })
  })

  describe('getCarById', () => {
    it('returns 404 when car is not found', async () => {
      Car.findById.mockReturnValue({
        populate: vi.fn().mockResolvedValue(null)
      })
      const req = { params: { id: '507f1f77bcf86cd799439012' }, user: { role: 'admin' } } as any
      const res = createMockRes() as any

      await getCarById(req, res)

      expect(mockStatus).toHaveBeenCalledWith(404)
      expect(mockJson).toHaveBeenCalledWith({ message: 'Автомобиль не найден' })
    })

    it('returns 200 with car when found', async () => {
      const req = { params: { id: mockCar._id }, user: { role: 'admin' } } as any
      const res = createMockRes() as any

      await getCarById(req, res)

      expect(mockJson).toHaveBeenCalledWith(mockCar)
    })
  })

  describe('createCar', () => {
    it('returns 201 with created car', async () => {
      const newCar = { ...mockCar, _id: '507f1f77bcf86cd799439013', save: vi.fn().mockResolvedValue(undefined) }
      Car.mockImplementation(() => newCar)
      const req = { body: { brand: 'Toyota', model: 'Camry', plate_number: 'B456DE', vin: 'WVWZZZ3CZWE654321', year: 2023, mileage: 0 } } as any
      const res = createMockRes() as any

      await createCar(req, res)

      expect(mockStatus).toHaveBeenCalledWith(201)
      expect(mockJson).toHaveBeenCalledWith(newCar)
    })
  })
})
