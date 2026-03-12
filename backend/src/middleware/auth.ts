import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      res.status(401).json({ message: 'Токен не предоставлен' })
      return
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string }
    const user = await User.findById(decoded.userId).select('-password').lean().exec()

    if (!user) {
      res.status(401).json({ message: 'Пользователь не найден' })
      return
    }

    req.user = user
    next()
  } catch {
    res.status(401).json({ message: 'Недействительный токен' })
  }
}

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Пользователь не аутентифицирован' })
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Доступ запрещен' })
      return
    }

    next()
  }
}
