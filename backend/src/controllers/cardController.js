import Card from '../models/Card.js'
import {getPaginationParams, paginatedResponse} from '../utils/pagination.js'

export const getAllCards = async (req, res) => {
    try {
        const filter = {}
        if (req.query.status) filter.status = req.query.status
        if (req.query.type) filter.type = req.query.type

        // Водитель видит только свои карты
        if (req.user?.role === 'driver' && req.user.employee_id) {
            filter.assigned_to = req.user.employee_id
        }
        const {page, limit, skip} = getPaginationParams(req.query)
        const [cards, total] = await Promise.all([
            Card.find(filter)
                .populate('assigned_to', 'full_name')
                .populate('assigned_car', 'brand model plate_number')
                .sort({created_at: -1})
                .skip(skip)
                .limit(limit),
            Card.countDocuments(filter)
        ])
        res.json(paginatedResponse(cards, total, page, limit))
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

export const getCardById = async (req, res) => {
    try {
        const card = await Card.findById(req.params.id)
            .populate('assigned_to', 'full_name')
            .populate('assigned_car', 'brand model plate_number')
        if (!card) {
            return res.status(404).json({message: 'Карта не найдена'})
        }

        // Водитель не может просматривать чужие карты
        if (req.user?.role === 'driver' && req.user.employee_id && card.assigned_to?.toString() !== req.user.employee_id.toString()) {
            return res.status(404).json({message: 'Карта не найдена'})
        }
        res.json(card)
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

export const createCard = async (req, res) => {
    try {
        const card = new Card(req.body)
        await card.save()

        // Отслеживаем начальные связи при создании
        if (req.user?._id) {
            try {
                const {trackCardLinks} = await import('../utils/linkHistory.js')
                const populatedCard = await Card.findById(card._id)
                    .populate('assigned_to')
                    .populate('assigned_car')

                if (populatedCard) {
                    const emptyCard = {assigned_to: null, assigned_car: null}
                    await trackCardLinks(emptyCard, populatedCard, req.user._id)
                }
            } catch (historyError) {
                // Игнорируем ошибки истории, чтобы не прерывать создание карты
                console.error('Ошибка создания истории связей:', historyError)
            }
        }

        res.status(201).json(card)
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({message: 'Карта с таким номером уже существует'})
        }
        res.status(400).json({message: error.message})
    }
}

export const updateCard = async (req, res) => {
    try {
        // Получаем старую версию для отслеживания изменений
        const oldCard = await Card.findById(req.params.id)
            .populate('assigned_to')
            .populate('assigned_car')

        const card = await Card.findByIdAndUpdate(
            req.params.id,
            req.body,
            {new: true, runValidators: true}
        )
            .populate('assigned_to')
            .populate('assigned_car')

        if (!card) {
            return res.status(404).json({message: 'Карта не найдена'})
        }

        // Отслеживаем изменения связей
        if (oldCard && req.user?._id) {
            try {
                const {trackCardLinks} = await import('../utils/linkHistory.js')
                await trackCardLinks(oldCard, card, req.user._id)
            } catch (historyError) {
                // Игнорируем ошибки истории, чтобы не прерывать обновление
                console.error('Ошибка создания истории связей:', historyError)
            }
        }

        res.json(card)
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({message: 'Карта с таким номером уже существует'})
        }
        res.status(400).json({message: error.message})
    }
}

export const deleteCard = async (req, res) => {
    try {
        const card = await Card.findByIdAndDelete(req.params.id)
        if (!card) {
            return res.status(404).json({message: 'Карта не найдена'})
        }
        res.json({message: 'Карта удалена'})
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}
