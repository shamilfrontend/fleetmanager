import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import type { Types } from 'mongoose'
import User from '../models/User.js'

const toUserId = (id: Types.ObjectId | string): string =>
  typeof id === 'string' ? id : id.toString()

const generateToken = (userId: Types.ObjectId | string): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET не установлен в переменных окружения')
  }
  return jwt.sign({ userId: toUserId(userId) }, process.env.JWT_SECRET, { expiresIn: '24h' })
}

const generateRefreshToken = (userId: Types.ObjectId | string): string => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET не установлен в переменных окружения')
  }
  return jwt.sign(
    { userId: toUserId(userId) },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  )
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email?: string; password?: string }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      res.status(400).json({ message: 'Пользователь с таким email уже существует' })
      return
    }

    const user = new User({
      email: email ?? '',
      password: password ?? '',
      role: 'driver'
    })

    await user.save()

    const token = generateToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    res.status(201).json({
      token,
      refreshToken,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email?: string; password?: string }

    if (!email || !password) {
      res.status(400).json({ message: 'Email и пароль обязательны' })
      return
    }

    const user = await User.findOne({ email })
    if (!user) {
      res.status(401).json({ message: 'Неверный email или пароль' })
      return
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      res.status(401).json({ message: 'Неверный email или пароль' })
      return
    }

    const token = generateToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    res.json({
      token,
      refreshToken,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
    res.status(500).json({ message })
  }
}

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string }

    if (!refreshToken) {
      res.status(401).json({ message: 'Refresh токен не предоставлен' })
      return
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as string
    ) as { userId: string }
    const token = generateToken(decoded.userId)

    res.json({ token })
  } catch {
    res.status(401).json({ message: 'Недействительный refresh токен' })
  }
}

export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.json({ message: 'Выход выполнен успешно' })
}

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ message: 'Не авторизован' })
      return
    }
    const user = await User.findById(req.user._id).select('-password').lean()
    res.json(user)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}

export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-password').lean()
    res.json(users)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role } = req.body as {
      email?: string
      password?: string
      role?: string
    }

    if (!email || !password) {
      res.status(400).json({ message: 'Email и пароль обязательны' })
      return
    }

    const validRoles = ['driver', 'manager', 'admin']
    if (role && !validRoles.includes(role)) {
      res.status(400).json({ message: 'Недопустимая роль' })
      return
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      res.status(400).json({ message: 'Пользователь с таким email уже существует' })
      return
    }

    const user = new User({
      email,
      password,
      role: (role as 'admin' | 'manager' | 'driver') || 'driver'
    })

    await user.save()

    res.status(201).json({
      message: 'Пользователь создан',
      user: {
        _id: user._id,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { role } = req.body as { role?: string }

    const validRoles = ['driver', 'manager', 'admin']
    if (!role || !validRoles.includes(role)) {
      res.status(400).json({ message: 'Недопустимая роль' })
      return
    }

    const user = await User.findById(id)
    if (!user) {
      res.status(404).json({ message: 'Пользователь не найден' })
      return
    }

    user.role = role as 'admin' | 'manager' | 'driver'
    await user.save()

    res.json({
      message: 'Роль обновлена',
      user: { _id: user._id, email: user.email, role: user.role }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    if (req.user && id === req.user._id.toString()) {
      res.status(400).json({ message: 'Нельзя удалить собственный аккаунт' })
      return
    }

    const user = await User.findByIdAndDelete(id)
    if (!user) {
      res.status(404).json({ message: 'Пользователь не найден' })
      return
    }

    res.json({ message: 'Пользователь удалён' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string
      newPassword?: string
    }

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Текущий и новый пароль обязательны' })
      return
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        message: 'Новый пароль должен содержать не менее 6 символов'
      })
      return
    }

    if (!req.user?._id) {
      res.status(401).json({ message: 'Не авторизован' })
      return
    }

    const user = await User.findById(req.user._id)
    if (!user) {
      res.status(404).json({ message: 'Пользователь не найден' })
      return
    }

    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) {
      res.status(401).json({ message: 'Неверный текущий пароль' })
      return
    }

    user.password = newPassword
    await user.save()

    res.json({ message: 'Пароль успешно изменен' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка смены пароля'
    res.status(500).json({ message })
  }
}
