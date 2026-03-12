import { body } from 'express-validator'

export const createEmployeeValidator = [
  body('full_name').trim().notEmpty().withMessage('ФИО обязательно'),
  body('position').trim().notEmpty().withMessage('Должность обязательна'),
  body('department').trim().notEmpty().withMessage('Отдел обязателен'),
  body('phone').trim().notEmpty().withMessage('Телефон обязателен'),
  body('hire_date').notEmpty().withMessage('Дата приёма обязательна'),
  body('card_id').optional().isMongoId().withMessage('Некорректный ID карты'),
  body('assigned_cars').optional().isArray().withMessage('assigned_cars должен быть массивом')
]

export const updateEmployeeValidator = [
  body('full_name').optional().trim().notEmpty().withMessage('ФИО не может быть пустым'),
  body('position').optional().trim().notEmpty().withMessage('Должность не может быть пустой'),
  body('department').optional().trim().notEmpty().withMessage('Отдел не может быть пустым'),
  body('phone').optional().trim().notEmpty().withMessage('Телефон не может быть пустым'),
  body('hire_date').optional().notEmpty().withMessage('Укажите дату приёма'),
  body('card_id').optional().isMongoId().withMessage('Некорректный ID карты'),
  body('assigned_cars').optional().isArray().withMessage('assigned_cars должен быть массивом')
]
