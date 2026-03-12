import express from 'express'
import {
  getMaintenanceHistory,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  getUpcomingMaintenance
} from '../controllers/maintenanceController.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = express.Router()

router.get('/upcoming', authenticate, getUpcomingMaintenance)
router.get('/', authenticate, getMaintenanceHistory)
router.get('/:id', authenticate, getMaintenanceById)
router.post('/', authenticate, authorize('admin', 'manager'), createMaintenance)
router.put('/:id', authenticate, authorize('admin', 'manager'), updateMaintenance)
router.delete('/:id', authenticate, authorize('admin', 'manager'), deleteMaintenance)

export default router
