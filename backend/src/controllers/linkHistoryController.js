import LinkHistory from '../models/LinkHistory.js'

export const getLinkHistory = async (req, res) => {
    try {
        const {
            linkType,
            employeeId,
            cardId,
            carId,
            action,
            limit = 100,
            offset = 0
        } = req.query

        const query = {}

        if (linkType) {
            query.link_type = linkType
        }
        if (employeeId) {
            query.employee_id = employeeId
        }
        if (cardId) {
            query.card_id = cardId
        }
        if (carId) {
            query.car_id = carId
        }
        if (action) {
            query.action = action
        }

        const history = await LinkHistory.find(query)
            .populate('employee_id', 'full_name')
            .populate('card_id', 'card_number')
            .populate('car_id', 'brand model plate_number')
            .populate('changed_by', 'email')
            .sort({created_at: -1})
            .limit(parseInt(limit))
            .skip(parseInt(offset))

        const total = await LinkHistory.countDocuments(query)

        res.json({
            data: history,
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        })
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

export const getLinkHistoryById = async (req, res) => {
    try {
        const history = await LinkHistory.findById(req.params.id)
            .populate('employee_id', 'full_name')
            .populate('card_id', 'card_number')
            .populate('car_id', 'brand model plate_number')
            .populate('changed_by', 'email')

        if (!history) {
            return res.status(404).json({message: 'Запись истории не найдена'})
        }

        res.json(history)
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}
