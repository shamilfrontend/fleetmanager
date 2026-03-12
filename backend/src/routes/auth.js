import express from 'express'
import rateLimit from 'express-rate-limit'
import {
    register,
    login,
    refresh,
    logout,
    getMe,
    changePassword,
    getUsers,
    createUser,
    updateUserRole,
    deleteUser
} from '../controllers/authController.js'
import {authenticate, authorize} from '../middleware/auth.js'
import {validate} from '../middleware/validate.js'
import {
    loginValidator,
    registerValidator,
    changePasswordValidator,
    createUserValidator,
    updateUserRoleValidator,
    refreshValidator
} from '../validators/authValidators.js'

const router = express.Router()

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {message: 'Слишком много попыток. Попробуйте через 15 минут.'},
    standardHeaders: true,
    legacyHeaders: false
})

router.post('/register', authLimiter, validate(registerValidator), register)
router.post('/login', authLimiter, validate(loginValidator), login)
router.post('/refresh', validate(refreshValidator), refresh)
router.post('/logout', logout)
router.get('/me', authenticate, getMe)
router.post('/change-password', authenticate, validate(changePasswordValidator), changePassword)
router.get('/users', authenticate, authorize('admin'), getUsers)
router.post('/users', authenticate, authorize('admin'), validate(createUserValidator), createUser)
router.put('/users/:id', authenticate, authorize('admin'), validate(updateUserRoleValidator), updateUserRole)
router.delete('/users/:id', authenticate, authorize('admin'), deleteUser)

export default router
