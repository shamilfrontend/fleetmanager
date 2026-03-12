import { body } from 'express-validator'

export const createCardValidator = [
  body('card_number').trim().notEmpty().withMessage('Номер карты обязателен'),
  body('type').isIn(['fuel', 'service']).withMessage('Тип: fuel или service'),
  body('balance').optional().isFloat({ min: 0 }).withMessage('Баланс не может быть отрицательным'),
  body('limit').optional().isFloat({ min: 0 }).withMessage('Лимит не может быть отрицательным'),
  body('assigned_to').optional().isMongoId().withMessage('Некорректный ID сотрудника'),
  body('assigned_car').optional().isMongoId().withMessage('Некорректный ID автомобиля'),
  body('status')
    .optional()
    .isIn(['active', 'blocked', 'expired'])
    .withMessage('Статус: active, blocked или expired')
]

export const updateCardValidator = [
  body('card_number').optional().trim().notEmpty().withMessage('Номер карты не может быть пустым'),
  body('type').optional().isIn(['fuel', 'service']).withMessage('Тип: fuel или service'),
  body('balance').optional().isFloat({ min: 0 }).withMessage('Баланс не может быть отрицательным'),
  body('limit').optional().isFloat({ min: 0 }).withMessage('Лимит не может быть отрицательным'),
  body('assigned_to').optional().isMongoId().withMessage('Некорректный ID сотрудника'),
  body('assigned_car').optional().isMongoId().withMessage('Некорректный ID автомобиля'),
  body('status')
    .optional()
    .isIn(['active', 'blocked', 'expired'])
    .withMessage('Статус: active, blocked или expired')
]
