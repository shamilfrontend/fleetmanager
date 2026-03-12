import { body } from 'express-validator'

export const createTransactionValidator = [
  body('card_id').isMongoId().withMessage('Некорректный ID карты'),
  body('employee_id').isMongoId().withMessage('Некорректный ID сотрудника'),
  body('car_id').isMongoId().withMessage('Некорректный ID автомобиля'),
  body('amount').isFloat({ min: 0 }).withMessage('Сумма не может быть отрицательной'),
  body('fuel_type').trim().notEmpty().withMessage('Тип топлива обязателен'),
  body('volume').isFloat({ min: 0 }).withMessage('Объём не может быть отрицательным'),
  body('location').trim().notEmpty().withMessage('Место заправки обязательно'),
  body('odometer').isFloat({ min: 0 }).withMessage('Пробег не может быть отрицательным'),
  body('date').optional().isISO8601().withMessage('Укажите корректную дату'),
  body('status')
    .optional()
    .isIn(['completed', 'pending', 'cancelled'])
    .withMessage('Статус: completed, pending или cancelled')
]

export const updateTransactionValidator = [
  body('card_id').optional().isMongoId().withMessage('Некорректный ID карты'),
  body('employee_id').optional().isMongoId().withMessage('Некорректный ID сотрудника'),
  body('car_id').optional().isMongoId().withMessage('Некорректный ID автомобиля'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Сумма не может быть отрицательной'),
  body('fuel_type').optional().trim().notEmpty().withMessage('Тип топлива не может быть пустым'),
  body('volume').optional().isFloat({ min: 0 }).withMessage('Объём не может быть отрицательным'),
  body('location').optional().trim().notEmpty().withMessage('Место заправки не может быть пустым'),
  body('odometer').optional().isFloat({ min: 0 }).withMessage('Пробег не может быть отрицательным'),
  body('date').optional().isISO8601().withMessage('Укажите корректную дату'),
  body('status')
    .optional()
    .isIn(['completed', 'pending', 'cancelled'])
    .withMessage('Статус: completed, pending или cancelled')
]
