import jwt from 'jsonwebtoken'

import User from '../models/User.js'

export const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '')

        if (!token) {
            return res.status(401).json({message: 'Токен не предоставлен'})
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(decoded.userId).select('-password')

        if (!user) {
            return res.status(401).json({message: 'Пользователь не найден'})
        }

        req.user = user
        next()
    } catch (error) {
        res.status(401).json({message: 'Недействительный токен'})
    }
}

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({message: 'Пользователь не аутентифицирован'})
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({message: 'Доступ запрещен'})
        }

        next()
    }
}
