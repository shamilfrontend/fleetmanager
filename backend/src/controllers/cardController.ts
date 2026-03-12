import type { Request, Response } from 'express'
import Card from '../models/Card.js'
import { getPaginationParams, paginatedResponse } from '../utils/pagination.js'

function isMongoDuplicateError(error: unknown): error is { code: number } {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000
}

export const getAllCards = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {}
    if (req.query.status) filter.status = req.query.status
    if (req.query.type) filter.type = req.query.type

    if (req.user?.role === 'driver' && req.user.employee_id) {
      filter.assigned_to = req.user.employee_id
    }
    const { page, limit, skip } = getPaginationParams(req.query as { page?: string; limit?: string })
    const [cards, total] = await Promise.all([
      Card.find(filter)
        .populate('assigned_to', 'full_name')
        .populate('assigned_car', 'brand model plate_number')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      Card.countDocuments(filter)
    ])
    res.json(paginatedResponse(cards, total, page, limit))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}

export const getCardById = async (req: Request, res: Response): Promise<void> => {
  try {
    const card = await Card.findById(req.params.id)
      .populate('assigned_to', 'full_name')
      .populate('assigned_car', 'brand model plate_number')
    if (!card) {
      res.status(404).json({ message: 'Карта не найдена' })
      return
    }

    if (
      req.user?.role === 'driver' &&
      req.user.employee_id &&
      card.assigned_to?.toString() !== req.user.employee_id.toString()
    ) {
      res.status(404).json({ message: 'Карта не найдена' })
      return
    }
    res.json(card)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}

export const createCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const card = new Card(req.body)
    await card.save()

    if (req.user?._id) {
      try {
        const { trackCardLinks } = await import('../utils/linkHistory.js')
        const populatedCard = await Card.findById(card._id)
          .populate('assigned_to')
          .populate('assigned_car')
          .lean()

        if (populatedCard) {
          const emptyCard = {
            assigned_to: null,
            assigned_car: null
          } as unknown as import('../models/Card.js').ICard
          await trackCardLinks(
            emptyCard,
            populatedCard as import('../models/Card.js').ICard,
            req.user._id
          )
        }
      } catch (historyError) {
        console.error('Ошибка создания истории связей:', historyError)
      }
    }

    res.status(201).json(card)
  } catch (error) {
    if (isMongoDuplicateError(error)) {
      res.status(400).json({ message: 'Карта с таким номером уже существует' })
      return
    }
    const message = error instanceof Error ? error.message : 'Ошибка валидации'
    res.status(400).json({ message })
  }
}

export const updateCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const oldCard = await Card.findById(req.params.id)
      .populate('assigned_to')
      .populate('assigned_car')
      .lean()

    const card = await Card.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('assigned_to')
      .populate('assigned_car')
      .lean()

    if (!card) {
      res.status(404).json({ message: 'Карта не найдена' })
      return
    }

    if (oldCard && req.user?._id) {
      try {
        const { trackCardLinks } = await import('../utils/linkHistory.js')
        await trackCardLinks(
          oldCard as import('../models/Card.js').ICard,
          card as import('../models/Card.js').ICard,
          req.user._id
        )
      } catch (historyError) {
        console.error('Ошибка создания истории связей:', historyError)
      }
    }

    res.json(card)
  } catch (error) {
    if (isMongoDuplicateError(error)) {
      res.status(400).json({ message: 'Карта с таким номером уже существует' })
      return
    }
    const message = error instanceof Error ? error.message : 'Ошибка валидации'
    res.status(400).json({ message })
  }
}

export const deleteCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const card = await Card.findByIdAndDelete(req.params.id)
    if (!card) {
      res.status(404).json({ message: 'Карта не найдена' })
      return
    }
    res.json({ message: 'Карта удалена' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}
