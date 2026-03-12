import express from 'express'
import {
    getAllCards,
    getCardById,
    createCard,
    updateCard,
    deleteCard
} from '../controllers/cardController.js'
import {authenticate, authorize} from '../middleware/auth.js'
import {validate} from '../middleware/validate.js'
import {createCardValidator, updateCardValidator} from '../validators/cardValidators.js'

const router = express.Router()

router.get('/', authenticate, getAllCards)
router.get('/:id', authenticate, getCardById)
router.post('/', authenticate, authorize('admin', 'manager'), validate(createCardValidator), createCard)
router.put('/:id', authenticate, authorize('admin', 'manager'), validate(updateCardValidator), updateCard)
router.delete('/:id', authenticate, authorize('admin', 'manager'), deleteCard)

export default router
