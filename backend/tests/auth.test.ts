import { describe, it, expect, vi, beforeEach } from 'vitest'

process.env.JWT_SECRET = 'test-jwt-secret'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'

const mockJson = vi.fn()
const mockStatus = vi.fn(() => ({ json: mockJson }))
const createMockRes = () => ({ status: mockStatus, json: mockJson })

const mockUserInstance = {
  _id: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
  role: 'driver',
  comparePassword: vi.fn()
}

vi.mock('../src/models/User.js', () => ({
  default: {
    findOne: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(() => ({ select: vi.fn(() => ({ lean: vi.fn(() => ({ exec: vi.fn() })) })) }))
  }
}))

const User = (await import('../src/models/User.js')).default
const { login, register, refresh } = await import('../src/controllers/authController.js')

describe('authController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStatus.mockReturnValue({ json: mockJson })
  })

  describe('login', () => {
    it('returns 400 when email or password is missing', async () => {
      const req = { body: {} } as any
      const res = createMockRes() as any

      await login(req, res)

      expect(mockStatus).toHaveBeenCalledWith(400)
      expect(mockJson).toHaveBeenCalledWith({ message: 'Email и пароль обязательны' })
    })

    it('returns 401 when user is not found', async () => {
      User.findOne.mockResolvedValue(null)
      const req = { body: { email: 'nobody@example.com', password: 'password' } } as any
      const res = createMockRes() as any

      await login(req, res)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({ message: 'Неверный email или пароль' })
    })

    it('returns 401 when password does not match', async () => {
      User.findOne.mockResolvedValue({
        ...mockUserInstance,
        comparePassword: vi.fn().mockResolvedValue(false)
      })
      const req = { body: { email: 'test@example.com', password: 'wrong' } } as any
      const res = createMockRes() as any

      await login(req, res)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({ message: 'Неверный email или пароль' })
    })

    it('returns 200 with token and user when credentials are valid', async () => {
      User.findOne.mockResolvedValue({
        ...mockUserInstance,
        comparePassword: vi.fn().mockResolvedValue(true)
      })
      const req = { body: { email: 'test@example.com', password: 'correct' } } as any
      const res = createMockRes() as any

      await login(req, res)

      expect(mockStatus).not.toHaveBeenCalled()
      expect(mockJson).toHaveBeenCalledTimes(1)
      const payload = mockJson.mock.calls[0][0]
      expect(payload).toHaveProperty('token')
      expect(payload).toHaveProperty('refreshToken')
      expect(payload.user).toEqual({
        _id: mockUserInstance._id,
        email: mockUserInstance.email,
        role: mockUserInstance.role
      })
    })
  })

  describe('register', () => {
    it('returns 400 when user with email already exists', async () => {
      User.findOne.mockResolvedValue(mockUserInstance)
      const req = { body: { email: 'test@example.com', password: 'password' } } as any
      const res = createMockRes() as any

      await register(req, res)

      expect(mockStatus).toHaveBeenCalledWith(400)
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Пользователь с таким email уже существует'
      })
    })
  })

  describe('refresh', () => {
    it('returns 401 when refresh token is not provided', async () => {
      const req = { body: {} } as any
      const res = createMockRes() as any

      await refresh(req, res)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({ message: 'Refresh токен не предоставлен' })
    })

    it('returns 401 when refresh token is invalid', async () => {
      const req = { body: { refreshToken: 'invalid-token' } } as any
      const res = createMockRes() as any

      await refresh(req, res)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({ message: 'Недействительный refresh токен' })
    })
  })
})
