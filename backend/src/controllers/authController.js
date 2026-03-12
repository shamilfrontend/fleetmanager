import jwt from 'jsonwebtoken'

import User from '../models/User.js'

const generateToken = (userId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET не установлен в переменных окружения')
    }
    return jwt.sign({userId}, process.env.JWT_SECRET, {expiresIn: '24h'})
}

const generateRefreshToken = (userId) => {
    if (!process.env.JWT_REFRESH_SECRET) {
        throw new Error('JWT_REFRESH_SECRET не установлен в переменных окружения')
    }
    return jwt.sign({userId}, process.env.JWT_REFRESH_SECRET, {expiresIn: '7d'})
}

export const register = async (req, res) => {
    try {
        const {email, password} = req.body

        const existingUser = await User.findOne({email})
        if (existingUser) {
            return res.status(400).json({message: 'Пользователь с таким email уже существует'})
        }

        const user = new User({
            email,
            password,
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
        res.status(500).json({message: error.message})
    }
}

export const login = async (req, res) => {
    try {
        const {email, password} = req.body

        if (!email || !password) {
            return res.status(400).json({message: 'Email и пароль обязательны'})
        }

        const user = await User.findOne({email})
        if (!user) {
            return res.status(401).json({message: 'Неверный email или пароль'})
        }

        const isMatch = await user.comparePassword(password)
        if (!isMatch) {
            return res.status(401).json({message: 'Неверный email или пароль'})
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
        console.error('Ошибка входа:', error)
        res.status(500).json({message: error.message || 'Внутренняя ошибка сервера'})
    }
}

export const refresh = async (req, res) => {
    try {
        const {refreshToken} = req.body

        if (!refreshToken) {
            return res.status(401).json({message: 'Refresh токен не предоставлен'})
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
        const token = generateToken(decoded.userId)

        res.json({token})
    } catch (error) {
        res.status(401).json({message: 'Недействительный refresh токен'})
    }
}

export const logout = async (req, res) => {
    res.json({message: 'Выход выполнен успешно'})
}

export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password')
        res.json(user)
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

export const getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').lean()
        res.json(users)
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

export const createUser = async (req, res) => {
    try {
        const {email, password, role} = req.body

        if (!email || !password) {
            return res.status(400).json({message: 'Email и пароль обязательны'})
        }

        const validRoles = ['driver', 'manager', 'admin']
        if (role && !validRoles.includes(role)) {
            return res.status(400).json({message: 'Недопустимая роль'})
        }

        const existingUser = await User.findOne({email})
        if (existingUser) {
            return res.status(400).json({message: 'Пользователь с таким email уже существует'})
        }

        const user = new User({
            email,
            password,
            role: role || 'driver'
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
        res.status(500).json({message: error.message})
    }
}

export const updateUserRole = async (req, res) => {
    try {
        const {id} = req.params
        const {role} = req.body

        const validRoles = ['driver', 'manager', 'admin']
        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({message: 'Недопустимая роль'})
        }

        const user = await User.findById(id)
        if (!user) {
            return res.status(404).json({message: 'Пользователь не найден'})
        }

        user.role = role
        await user.save()

        res.json({
            message: 'Роль обновлена',
            user: {_id: user._id, email: user.email, role: user.role}
        })
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

export const deleteUser = async (req, res) => {
    try {
        const {id} = req.params

        if (id === req.user._id.toString()) {
            return res.status(400).json({message: 'Нельзя удалить собственный аккаунт'})
        }

        const user = await User.findByIdAndDelete(id)
        if (!user) {
            return res.status(404).json({message: 'Пользователь не найден'})
        }

        res.json({message: 'Пользователь удалён'})
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

export const changePassword = async (req, res) => {
    try {
        const {currentPassword, newPassword} = req.body

        if (!currentPassword || !newPassword) {
            return res.status(400).json({message: 'Текущий и новый пароль обязательны'})
        }

        if (newPassword.length < 6) {
            return res.status(400).json({message: 'Новый пароль должен содержать не менее 6 символов'})
        }

        const user = await User.findById(req.user._id)
        if (!user) {
            return res.status(404).json({message: 'Пользователь не найден'})
        }

        // Проверяем текущий пароль
        const isMatch = await user.comparePassword(currentPassword)
        if (!isMatch) {
            return res.status(401).json({message: 'Неверный текущий пароль'})
        }

        // Устанавливаем новый пароль (будет автоматически захеширован через pre-save hook)
        user.password = newPassword
        await user.save()

        res.json({message: 'Пароль успешно изменен'})
    } catch (error) {
        console.error('Ошибка смены пароля:', error)
        res.status(500).json({message: error.message || 'Ошибка смены пароля'})
    }
}
