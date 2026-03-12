import { body } from 'express-validator'

const emailMsg = 'Укажите корректный email'
const passwordMinMsg = 'Пароль должен быть не менее 6 символов'

export const loginValidator = [
  body('email').isEmail().withMessage(emailMsg).normalizeEmail(),
  body('password').notEmpty().withMessage('Введите пароль')
]

export const registerValidator = [
  body('email').isEmail().withMessage(emailMsg).normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage(passwordMinMsg)
]

export const refreshValidator = [
  body('refreshToken').notEmpty().withMessage('Refresh токен обязателен')
]

export const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Текущий пароль обязателен'),
  body('newPassword').isLength({ min: 6 }).withMessage(passwordMinMsg)
]

export const createUserValidator = [
  body('email').isEmail().withMessage(emailMsg).normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage(passwordMinMsg),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'driver'])
    .withMessage('Роль должна быть: admin, manager или driver')
]

export const updateUserRoleValidator = [
  body('role')
    .isIn(['admin', 'manager', 'driver'])
    .withMessage('Роль должна быть: admin, manager или driver')
]
