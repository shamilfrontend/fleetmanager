import express from 'express'
import { getLinkHistory, getLinkHistoryById } from '../controllers/linkHistoryController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.get('/', authenticate, getLinkHistory)
router.get('/:id', authenticate, getLinkHistoryById)

export default router
