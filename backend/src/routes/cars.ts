import express from 'express'
import {
  getAllCars,
  getCarById,
  createCar,
  updateCar,
  deleteCar,
  uploadCarPhoto,
  deleteCarPhoto,
  uploadCarDocument,
  deleteCarDocument
} from '../controllers/carController.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { uploadPhoto, uploadDocument } from '../middleware/upload.js'
import { validate } from '../middleware/validate.js'
import { createCarValidator, updateCarValidator } from '../validators/carValidators.js'

const router = express.Router()

router.get('/', authenticate, getAllCars)
router.get('/:id', authenticate, getCarById)
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  validate(createCarValidator),
  createCar
)
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  validate(updateCarValidator),
  updateCar
)
router.delete('/:id', authenticate, authorize('admin', 'manager'), deleteCar)
router.post(
  '/:id/photos',
  authenticate,
  authorize('admin', 'manager'),
  uploadPhoto.single('photo') as unknown as express.RequestHandler,
  uploadCarPhoto
)
router.delete('/:id/photos', authenticate, authorize('admin', 'manager'), deleteCarPhoto)
router.post(
  '/:id/documents',
  authenticate,
  authorize('admin', 'manager'),
  uploadDocument.single('document') as unknown as express.RequestHandler,
  uploadCarDocument
)
router.delete(
  '/:id/documents',
  authenticate,
  authorize('admin', 'manager'),
  deleteCarDocument
)

export default router
