import { body } from 'express-validator'

const currentYear = new Date().getFullYear()
const maxYear = currentYear + 1

export const createCarValidator = [
  body('brand').trim().notEmpty().withMessage('Марка обязательна'),
  body('model').trim().notEmpty().withMessage('Модель обязательна'),
  body('plate_number').trim().notEmpty().withMessage('Госномер обязателен'),
  body('vin').trim().notEmpty().withMessage('VIN обязателен'),
  body('year').isInt({ min: 1900, max: maxYear }).withMessage('Укажите корректный год'),
  body('mileage').optional().isFloat({ min: 0 }).withMessage('Пробег не может быть отрицательным'),
  body('status')
    .optional()
    .isIn(['active', 'repair', 'reserve'])
    .withMessage('Статус: active, repair или reserve'),
  body('assigned_to').optional().isMongoId().withMessage('Некорректный ID сотрудника')
]

export const updateCarValidator = [
  body('brand').optional().trim().notEmpty().withMessage('Марка не может быть пустой'),
  body('model').optional().trim().notEmpty().withMessage('Модель не может быть пустой'),
  body('plate_number').optional().trim().notEmpty().withMessage('Госномер не может быть пустым'),
  body('vin').optional().trim().notEmpty().withMessage('VIN не может быть пустым'),
  body('year')
    .optional()
    .isInt({ min: 1900, max: maxYear })
    .withMessage('Укажите корректный год'),
  body('mileage').optional().isFloat({ min: 0 }).withMessage('Пробег не может быть отрицательным'),
  body('status')
    .optional()
    .isIn(['active', 'repair', 'reserve'])
    .withMessage('Статус: active, repair или reserve'),
  body('assigned_to').optional().isMongoId().withMessage('Некорректный ID сотрудника')
]
