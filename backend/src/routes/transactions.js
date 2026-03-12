import express from 'express'
import {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction
} from '../controllers/transactionController.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import {
  createTransactionValidator,
  updateTransactionValidator
} from '../validators/transactionValidators.js'

const router = express.Router()

router.get('/', authenticate, getAllTransactions)
router.get('/:id', authenticate, getTransactionById)
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  validate(createTransactionValidator),
  createTransaction
)
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  validate(updateTransactionValidator),
  updateTransaction
)
router.delete('/:id', authenticate, authorize('admin', 'manager'), deleteTransaction)

export default router
