import express from 'express'
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
} from '../controllers/employeeController.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { createEmployeeValidator, updateEmployeeValidator } from '../validators/employeeValidators.js'

const router = express.Router()

router.get('/', authenticate, getAllEmployees)
router.get('/:id', authenticate, getEmployeeById)
router.post('/', authenticate, authorize('admin', 'manager'), validate(createEmployeeValidator), createEmployee)
router.put('/:id', authenticate, authorize('admin', 'manager'), validate(updateEmployeeValidator), updateEmployee)
router.delete('/:id', authenticate, authorize('admin', 'manager'), deleteEmployee)

export default router
